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

import type { AnyShape } from "@bott/model";

const MAX_RECURSION_DEPTH = 100;

interface EstimationNode {
  size: number;
  children?: EstimationNode[] | Record<string, EstimationNode>;
}

/**
 * Smartly serializes an object or string to fit within a character budget.
 * 1. Build an estimation tree estimating the exact JSON size of every subtree.
 * 2. Load balance the budget across children proportional to their size.
 */
export function budgetedStringify(value: unknown, totalBudget: number): string {
  function _buildEstimationTree(value: unknown, depth: number): EstimationNode {
    if (depth > MAX_RECURSION_DEPTH) {
      return { size: "[Max Depth]".length };
    }

    // Base case
    if (value === null) return { size: "null".length };
    if (typeof value === "boolean") {
      return { size: value ? "true".length : "false".length };
    }
    if (typeof value === "number") return { size: String(value).length };
    if (typeof value === "string") return { size: `"${value}"`.length };
    if (
      value === undefined || typeof value === "function" ||
      typeof value === "symbol"
    ) return { size: 0 };

    let size = 0;

    if (Array.isArray(value)) {
      size += 2; // [] characters
      if (value.length > 1) size += value.length - 1; // commas

      const children: EstimationNode[] = [];
      for (const item of value) {
        const child = _buildEstimationTree(item, depth + 1);
        size += child.size;
        children.push(child);
      }
      return { size, children };
    }

    size += 2; // {} characters
    const keys = Object.keys(value as object);
    if (keys.length > 1) size += keys.length - 1; // commas

    const children: Record<string, EstimationNode> = {};
    for (const key of keys) {
      size += `"${key}":`.length;
      const child = _buildEstimationTree(
        (value as Record<string, unknown>)[key],
        depth + 1,
      );
      size += child.size;
      children[key] = child;
    }

    return { size, children };
  }

  const shadowRoot = _buildEstimationTree(value, 0);

  function _balancedSerialize(
    value: unknown,
    estimation: EstimationNode,
    budget: number,
  ): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "boolean") return String(value);
    if (typeof value === "number") return String(value);

    if (typeof value === "string") {
      if (estimation.size <= budget) return JSON.stringify(value);
      if (budget < 2) return "…";

      const maxContent = Math.max(0, budget - 2);
      const truncated = value.substring(0, Math.max(0, maxContent - 1)) + "…";

      return JSON.stringify(truncated);
    }

    if (Array.isArray(value)) {
      if (!estimation.children) return "[…]"; // Max depth reached

      const children = estimation.children as EstimationNode[];

      // Overhead: [] (2) + commas (N-1)
      const overhead = 2 + Math.max(0, children.length - 1);
      const available = budget - overhead;

      if (available < 0) return "[…]";

      const totalSize = children.reduce((sum, c) => sum + c.size, 0);
      const ratio = totalSize > 0 ? available / totalSize : 0;

      const items = value.map((item, i) => {
        const childNode = children[i];
        if (item === undefined) return "null";

        const allocated = Math.floor(childNode.size * ratio);

        return _balancedSerialize(item, childNode, allocated);
      });
      return `[${items.join(",")}]`;
    }

    if (typeof value === "object" && value !== null) {
      if (!estimation.children) return "{…}"; // Max depth reached

      const childMap = estimation.children as Record<string, EstimationNode>;
      const keys = Object.keys(childMap);

      // Overhead: {} (2) + commas (N-1) + key formatting ("key":)
      let overhead = 2 + Math.max(0, keys.length - 1);
      for (const key of keys) overhead += key.length + 3;

      const available = budget - overhead;
      if (available < 0) return "{…}";

      let totalSize = 0;
      for (const key of keys) totalSize += childMap[key].size;

      const ratio = totalSize > 0 ? available / totalSize : 0;

      const entries: string[] = [];
      for (const key of keys) {
        const childNode = childMap[key];
        const val = (value as AnyShape)[key];
        if (val === undefined) continue;

        const allocated = Math.floor(childNode.size * ratio);
        const serializedVal = _balancedSerialize(val, childNode, allocated);
        entries.push(`"${key}":${serializedVal}`);
      }
      return `{${entries.join(",")}}`;
    }

    return "";
  }

  const result = _balancedSerialize(value, shadowRoot, totalBudget);
  return result.length > totalBudget
    ? result.substring(0, Math.max(0, totalBudget - 1)) + "…"
    : result;
}
