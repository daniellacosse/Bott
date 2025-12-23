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
const ELLIPSIS = "…";

interface EstimationNode {
  size: number;
  children?: EstimationNode[] | Record<string, EstimationNode>;
}

/**
 * Joins multiple arguments into a space-separated string,
 * respecting the total character budget.
 * Top-level strings are included without quotes.
 */
export function budgetedJoin(
  values: unknown[],
  totalBudget: number,
): string {
  // 1. Build estimation trees for all values
  const nodes = values.map((value) => {
    if (typeof value === "string") {
      return { size: value.length };
    }
    return buildEstimationTree(value, 0);
  });

  // Calculate overhead
  const overhead = Math.max(0, values.length - 1);
  const available = totalBudget - overhead;

  if (available < 0) return ELLIPSIS;

  const totalSize = nodes.reduce((sum, n) => sum + n.size, 0);
  const ratio = totalSize > 0 ? available / totalSize : 0;

  const parts = values.map((v, i) => {
    const node = nodes[i];
    const budget = Math.floor(node.size * ratio);

    if (typeof v === "string") {
      if (node.size <= budget) return v;
      if (budget < ELLIPSIS.length) return ELLIPSIS;

      const availableForText = budget - ELLIPSIS.length;
      if (availableForText < 2) return v.substring(0, budget - 1) + ELLIPSIS;

      const startLen = Math.ceil(availableForText / 2);
      const endLen = Math.floor(availableForText / 2);

      return v.substring(0, startLen) + ELLIPSIS +
        v.substring(v.length - endLen);
    }

    // Use regular balancedSerialize for non-strings
    return balancedSerialize(v, node, budget);
  });

  return parts.join(" ");
}

function buildEstimationTree(value: unknown, depth: number): EstimationNode {
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
      const child = buildEstimationTree(item, depth + 1);
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
    const child = buildEstimationTree(
      (value as Record<string, unknown>)[key],
      depth + 1,
    );
    size += child.size;
    children[key] = child;
  }

  return { size, children };
}

function balancedSerialize(
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

    if (budget < ELLIPSIS.length) return ELLIPSIS;
    const contentBudget = budget - ELLIPSIS.length;
    if (contentBudget < ELLIPSIS.length) return `"${ELLIPSIS}"`;
    if (contentBudget < `"a${ELLIPSIS}a"`.length) {
      const truncated = value.substring(0, Math.max(0, contentBudget - 1)) +
        ELLIPSIS;
      return JSON.stringify(truncated);
    }

    const availableForText = contentBudget - ELLIPSIS.length;
    const startLen = Math.ceil(availableForText / 2);
    const endLen = Math.floor(availableForText / 2);

    const truncated = value.substring(0, startLen) + ELLIPSIS +
      value.substring(value.length - endLen);
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

      return balancedSerialize(item, childNode, allocated);
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
      const serializedVal = balancedSerialize(val, childNode, allocated);
      entries.push(`"${key}":${serializedVal}`);
    }
    return `{${entries.join(",")}}`;
  }

  return "";
}
