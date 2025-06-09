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

import type { SupportedValueType } from "node:sqlite";

export interface SqlInstructions {
  query: string;
  params: SupportedValueType[];
}

// deno-lint-ignore no-explicit-any
function isSqlInstructions(value: any): value is SqlInstructions {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.query === "string" &&
    Array.isArray(value.params)
  );
}

// Helper to process a single non-array interpolation item.
// It returns the query string part for this item and pushes its parameters to the paramsCollector.
function processInterpolationValue(
  item: SupportedValueType | SqlInstructions | undefined,
  paramsCollector: SupportedValueType[],
): string {
  if (isSqlInstructions(item)) {
    paramsCollector.push(...item.params);
    return item.query;
  }
  // It's a SupportedValueType
  if (item === undefined || item === "undefined" || item === "null") {
    paramsCollector.push(null);
  } else {
    paramsCollector.push(item);
  }
  return "?";
}

export function sql( // naive sql tag
  strings: TemplateStringsArray,
  ...interpolations: (
    | undefined
    | SupportedValueType
    | SqlInstructions
    | (SqlInstructions | SupportedValueType)[]
  )[]
): SqlInstructions {
  let [query] = strings.raw;
  const params: SupportedValueType[] = [];

  for (let i = 0; i < interpolations.length; i++) {
    const interpolation = interpolations[i];

    if (Array.isArray(interpolation)) {
      // Handle array interpolations (e.g., for IN clauses or multiple VALUES)
      // Each item in the array is processed, and their query parts are joined by ", "
      const arrayQueryParts = interpolation.map((item) =>
        processInterpolationValue(item, params)
      );
      query += arrayQueryParts.join(", ");
    } else {
      // Handle single SqlInstructions or SupportedValueType
      query += processInterpolationValue(interpolation, params);
    }

    // Add the static string part that follows this interpolation
    query += strings.raw[i + 1];
  }

  return {
    query,
    params,
  };
}
