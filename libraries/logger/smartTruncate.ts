/**
 * @license
 * This file is part of Bott.
 *
 * This project is dual-licensed:
 * - Non-commercial use: AGPLv3 (see LICENSE file for full text).
 * - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
 *
 * Copyright (C) 2025 DanielLaCos.se
 */

const MAX_RECURSION_DEPTH = 100;

interface ShadowNode {
  size: number;
  children?: ShadowNode[] | Record<string, ShadowNode>;
  isCircular?: boolean;
  containsCircular?: boolean;
}

/**
 * Smartly truncates an object or string to fit within a character budget.
 * Uses a Shadow Tree strategy:
 * 1. Build a shadow tree estimating the exact JSON size of every subtree.
 * 2. Load balance the budget across children proportional to their size.
 */
export function smartTruncate(value: unknown, maxChars: number): unknown {
  // Pass 1: Estimation (Build Shadow Tree)
  const stack = new Set<unknown>();

  function buildShadow(obj: unknown, depth: number): ShadowNode {
    // Basic primitives constants
    if (obj === null) return { size: 4 }; // "null"
    if (obj === undefined) return { size: 0 }; // Omitted/handled by parent effectively, but for array it's null (4)
    if (typeof obj === "boolean") return { size: obj ? 4 : 5 }; // "true" or "false"
    if (typeof obj === "number") return { size: String(obj).length };
    if (typeof obj === "string") return { size: obj.length + 2 }; // "string" quotes

    // Complex types
    if (typeof obj !== "object") return { size: 0 }; // Ignore functions/symbols

    if (depth > MAX_RECURSION_DEPTH) {
      return { size: 13 }; // "[Max Depth]" + quotes approx
    }

    if (stack.has(obj)) {
      return { size: 12, isCircular: true, containsCircular: true }; // "[Circular]" + quotes
    }
    stack.add(obj);

    let size = 0;
    let containsCircular = false;
    let children: ShadowNode[] | Record<string, ShadowNode>;

    if (Array.isArray(obj)) {
      size += 2; // []
      if (obj.length > 1) size += obj.length - 1; // commas

      const childNodes: ShadowNode[] = [];
      for (const item of obj) {
        const child = buildShadow(item, depth + 1);
        size += child.size;
        if (child.containsCircular) containsCircular = true;
        childNodes.push(child);
      }
      children = childNodes;
    } else {
      size += 2; // {}
      const keys = Object.keys(obj as object);
      if (keys.length > 1) size += keys.length - 1; // commas

      const childMap: Record<string, ShadowNode> = {};
      for (const key of keys) {
        size += key.length + 3; // "key":
        const child = buildShadow(
          (obj as Record<string, unknown>)[key],
          depth + 1,
        );
        size += child.size;
        if (child.containsCircular) containsCircular = true;
        childMap[key] = child;
      }
      children = childMap;
    }

    stack.delete(obj);
    return { size, children, containsCircular };
  }

  const rootShadow = buildShadow(value, 0);

  // Pass 2: Budgeting (Load Balance)
  function applyBudget(
    obj: unknown,
    shadow: ShadowNode,
    budget: number,
  ): unknown {
    if (shadow.size <= budget && !shadow.containsCircular) return obj;
    if (shadow.isCircular) return "[Circular]";

    // Primitives
    if (typeof obj === "string") {
      // String overhead is 2 quotes. Available for content = budget - 2.
      // If budget < 5 (quotes + "..."), return partial?
      // min content budget e.g. 3 chars + quotes = 5.
      if (budget < 5) return "…"; // Too small for quotes + content

      const maxContent = budget - 2;
      // "..." is length 1 (U+2026) or 3? Assuming 1 char for logic but JSON encoded?
      // "…" usually stays as is in JS string. JSON.stringify escapes?
      // Let's assume 1 char cost for "…".
      // If truncation needed: content must be maxContent - 1 ("…")
      const safeLen = Math.max(0, maxContent - 1);
      return obj.substring(0, safeLen) + "…";
    }

    // Arrays/Objects
    if (Array.isArray(obj) && Array.isArray(shadow.children)) { // Array check
      const childShadows = shadow.children;
      // Overhead: [] (2) + commas (len-1)
      const structuralOverhead = 2 + Math.max(0, childShadows.length - 1);
      const available = budget - structuralOverhead;

      if (available <= 0) return "…"; // Not enough for structure

      const totalChildrenSize = childShadows.reduce(
        (sum, c) => sum + c.size,
        0,
      );
      // Optimization: If totalChildrenSize is 0, we avoid divide by zero, but size > budget implies children exist?
      // Actually could be local overhead > budget.

      const ratio = totalChildrenSize > 0 ? available / totalChildrenSize : 0;

      return obj.map((item, i) => {
        const childShadow = childShadows[i];
        // Floor? Or Round? Floor ensures we stay under.
        const childBudget = Math.floor(childShadow.size * ratio);
        // Ensure at least minimal budget? Or zero if ratio is tiny.
        // If childBudget is too small to useful, applyBudget handles it.
        return applyBudget(item, childShadow, childBudget);
      });
    } else if (
      typeof obj === "object" && obj !== null && !Array.isArray(shadow.children)
    ) { // Object check
      const childMap = shadow.children as Record<string, ShadowNode>;
      const keys = Object.keys(obj as object);

      // Overhead: {} (2) + commas (len-1) + keys ("key":)
      let structuralOverhead = 2 + Math.max(0, keys.length - 1);
      keys.forEach((k) => structuralOverhead += k.length + 3);

      const available = budget - structuralOverhead;
      if (available <= 0) return "…";

      let totalChildrenSize = 0;
      keys.forEach((k) => totalChildrenSize += childMap[k].size);

      const ratio = totalChildrenSize > 0 ? available / totalChildrenSize : 0;

      const result: Record<string, unknown> = {};
      keys.forEach((key) => {
        const childShadow = childMap[key];
        // If key itself takes budget, it's counted in overhead.
        // Child budget is for value.
        const childBudget = Math.floor(childShadow.size * ratio);
        result[key] = applyBudget(
          (obj as Record<string, unknown>)[key],
          childShadow,
          childBudget,
        );
      });
      return result;
    }

    // Fallback (numbers, booleans that didn't fit??)
    // If a number (e.g. 12345) has size 5 but budget is 4, what do we do?
    // Convert to string and truncate? Or return as is?
    // Strictly, applyBudget should return something fitting.
    // Primitives often can't be truncated meaningfully while keeping type.
    // If we return raw number, JSON stringify will overflow.
    // If strict compliance is needed, convert to string "12..."?
    // Let's assume primitives are small enough or we accept slight overflow for them,
    // OR we convert to string to enforce.
    // User goal: "it all fits".
    // Let's stringify if overflow.
    if (String(obj).length > budget) {
      return String(obj).substring(0, Math.max(0, budget - 1)) + "…";
    }
    return obj;
  }

  return applyBudget(value, rootShadow, maxChars);
}
