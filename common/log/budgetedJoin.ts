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

const ELLIPSIS = "…";
const LAYER_BIAS = 0.5; // Bias for shallow-object preference
const KEY_ALLOCATION_RATIO = 0.25; // Ratio of key-to-value allocation
const RECURSION_DEPTH_LIMIT = 100;

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
  // Build estimation trees for all values
  const nodes = values.map((value) => {
    if (typeof value === "string") {
      return { size: value.length };
    }

    return buildEstimationTree(value, 0);
  });

  // Calculate overhead (spaces between items)
  const overhead = Math.max(0, values.length - 1);
  const available = totalBudget - overhead;

  if (available < 0) return ELLIPSIS;

  // Weighted allocation
  let totalWeight = 0;
  const weights = nodes.map((n) => {
    const w = Math.pow(n.size, LAYER_BIAS);
    totalWeight += w;
    return w;
  });

  const ratio = totalWeight > 0 ? available / totalWeight : 0;

  const parts = values.map((v, i) => {
    const weight = weights[i];
    const budget = Math.floor(weight * ratio);

    if (typeof v === "string") {
      return truncateString(v, budget);
    }

    if (v instanceof Error) {
      const message = v.stack || v.message || String(v);
      return truncateString(message, budget);
    }

    if (v instanceof File) {
      return truncateString(v.name, budget);
    }

    // Use regular balancedSerialize for non-strings
    return balancedSerialize(v, nodes[i], budget);
  });

  return parts.join(" ");
}

/**
 * Helper to truncate string string to fit budget.
 * Handles quoting if requested.
 */
function truncateString(
  value: string,
  budget: number,
  quote: boolean = false,
): string {
  const quoteLen = quote ? 2 : 0;
  if (value.length + quoteLen <= budget) {
    return quote ? JSON.stringify(value) : value;
  }

  if (budget < ELLIPSIS.length) return ELLIPSIS;

  const contentBudget = budget - quoteLen;
  if (contentBudget < ELLIPSIS.length) {
    if (quote) return `"${ELLIPSIS}"`.substring(0, budget);

    return ELLIPSIS;
  }

  if (quote) {
    const availableForText = contentBudget - ELLIPSIS.length;

    // Center truncation
    const startLen = Math.ceil(availableForText / 2);
    const endLen = Math.floor(availableForText / 2);

    const truncated = value.substring(0, startLen) + ELLIPSIS +
      value.substring(value.length - endLen);
    return JSON.stringify(truncated);
  } else {
    // No quotes, raw string
    const availableForText = budget - ELLIPSIS.length;
    if (availableForText < `a${ELLIPSIS}`.length) {
      return value[0] + ELLIPSIS;
    }

    const startLen = Math.ceil(availableForText / 2);
    const endLen = Math.floor(availableForText / 2);

    return value.substring(0, startLen) + ELLIPSIS +
      value.substring(value.length - endLen);
  }
}

function buildEstimationTree(value: unknown, depth: number): EstimationNode {
  if (depth > RECURSION_DEPTH_LIMIT) {
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

  if (value instanceof Error) {
    const message = value.stack || value.message || String(value);
    return { size: message.length };
  }

  if (
    typeof value === "object" && value !== null &&
    "toJSON" in value && typeof value.toJSON === "function"
  ) {
    return buildEstimationTree(
      value.toJSON(),
      depth,
    );
  }

  let size = 0;

  if (Array.isArray(value)) {
    size += "[]".length;
    if (value.length > 1) size += value.length - ",".length;

    const children: EstimationNode[] = [];
    for (const item of value) {
      const child = buildEstimationTree(item, depth + 1);
      size += child.size;
      children.push(child);
    }
    return { size, children };
  }

  size += "{}".length;
  const keys = Object.keys(value as object);
  if (keys.length > 1) size += keys.length - ",".length;

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

  if (value instanceof Error) {
    const message = value.stack || value.message || String(value);
    return truncateString(message, budget, true);
  }

  if (
    typeof value === "object" && value !== null &&
    "toJSON" in value && typeof value.toJSON === "function"
  ) {
    return balancedSerialize(
      value.toJSON(),
      estimation,
      budget,
    );
  }

  if (typeof value === "string") {
    return truncateString(value, budget, true);
  }

  if (Array.isArray(value)) {
    if (!estimation.children) return "[…]";

    const children = estimation.children as EstimationNode[];

    // Overhead: [] (2) + commas (N-1)
    const overhead = 2 + Math.max(0, children.length - 1);
    const available = budget - overhead;

    if (available < 0) return "[…]";

    // Weighted allocation
    let totalWeight = 0;
    const weights = children.map((c) => {
      const w = Math.pow(c.size, LAYER_BIAS);
      totalWeight += w;
      return w;
    });
    const ratio = totalWeight > 0 ? available / totalWeight : 0;

    const items = value.map((item, i) => {
      const childNode = children[i];
      if (item === undefined) return "null";

      const allocated = Math.floor(weights[i] * ratio);
      return balancedSerialize(item, childNode, allocated);
    });
    return `[${items.join(",")}]`;
  }

  if (typeof value === "object" && value !== null) {
    if (!estimation.children) return "{…}";

    const childMap = estimation.children as Record<string, EstimationNode>;
    const keys = Object.keys(childMap);

    // Structural Overhead: {} (2) + commas (N-1)
    const overhead = 2 + Math.max(0, keys.length - 1);

    const available = budget - overhead;
    if (available < 0) return "{…}";

    let totalWeight = 0;
    const entryWeights: number[] = [];

    for (const key of keys) {
      const keySize = key.length + `"":`.length;
      const valSize = childMap[key].size;
      const entrySize = keySize + valSize;
      const w = Math.pow(entrySize, LAYER_BIAS);
      totalWeight += w;
      entryWeights.push(w);
    }

    const ratio = totalWeight > 0 ? available / totalWeight : 0;

    const entries: string[] = [];
    keys.forEach((key, i) => {
      const childNode = childMap[key];
      const propertyValue = (value as AnyShape)[key];
      if (propertyValue === undefined) return;

      const entryAllocated = Math.floor(entryWeights[i] * ratio);

      // Strategy: Bias towards Value..
      const fullKey = `"${key}":`;
      if (fullKey.length <= entryAllocated) {
        // Try to allocate rest to value
        const valBudget = entryAllocated - fullKey.length;
        const minKeyLength = `"a${ELLIPSIS}a"`.length;

        const neededForValue = childNode.size;
        const missingForValue = Math.max(0, neededForValue - valBudget);

        if (missingForValue > 0 && fullKey.length > minKeyLength) {
          const stealable = fullKey.length - minKeyLength;
          const toSteal = Math.min(stealable, missingForValue);

          const keyBudget = fullKey.length - toSteal;
          const finalValueBudget = entryAllocated - keyBudget;

          const rawKeyBudget = keyBudget - `"":`.length;
          const rawTruncatedKey = truncateString(key, rawKeyBudget);

          const valueString = balancedSerialize(
            propertyValue,
            childNode,
            finalValueBudget,
          );

          entries.push(`"${rawTruncatedKey}":${valueString}`);
          return;
        }

        // Default: Full Key
        const valueString = balancedSerialize(
          propertyValue,
          childNode,
          valBudget,
        );
        entries.push(`${fullKey}${valueString}`);
      } else {
        const keyBudget = Math.max(
          `"a${ELLIPSIS}a":`.length,
          Math.floor(entryAllocated * KEY_ALLOCATION_RATIO),
        );
        const valBudget = Math.max(`""`.length, entryAllocated - keyBudget);

        const rawKeyBudget = Math.max(
          ELLIPSIS.length + 1,
          keyBudget - `"":`.length,
        );

        const rawTruncatedKey = truncateString(key, rawKeyBudget);
        const valueString = balancedSerialize(
          propertyValue,
          childNode,
          valBudget,
        );
        entries.push(`"${rawTruncatedKey}":${valueString}`);
      }
    });

    return `{${entries.join(",")}}`;
  }

  return "";
}
