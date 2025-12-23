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

import type {
  BottEventActionParameterDefinition,
  BottEventActionParameterRecord,
} from "@bott/events";

export function applyParameterDefaults(
  schema: BottEventActionParameterDefinition[] = [],
  parameters: BottEventActionParameterRecord = {},
): BottEventActionParameterRecord {
  const result = structuredClone(parameters);

  for (const field of schema) {
    result[field.name] ??= field.defaultValue;
  }

  return result;
}

export function validateParameters(
  schema: BottEventActionParameterDefinition[] = [],
  parameters: BottEventActionParameterRecord = {},
) {
  // Check for unknown parameters
  for (const param of Object.keys(parameters)) {
    if (!schema.find((s) => s.name === param)) {
      throw new Error(`Unknown parameter: ${param}`);
    }
  }

  for (const field of schema) {
    const param = parameters[field.name];

    if (field.required && param === undefined) {
      throw new Error(`validateParameters: Missing required parameter: ${field.name}`);
    }

    if (param !== undefined) {
      if (field.type === "file") {
        if (!(param instanceof File)) {
          throw new Error(
            `Parameter '${field.name}' must be of type file`,
          );
        }
      } else if (
        (field.type === "string" && typeof param !== "string") ||
        (field.type === "number" && typeof param !== "number") ||
        (field.type === "boolean" && typeof param !== "boolean")
      ) {
        throw new Error(
          `Parameter '${field.name}' must be of type ${field.type}`,
        );
      }

      if (
        field.type === "string" &&
        field.allowedValues &&
        !field.allowedValues.includes(
          param as string,
        )
      ) {
        throw new Error(
          `validateParameters: Parameter '${field.name}' has invalid value '${param}'. Allowed values: ${field.allowedValues.join(", ")}`,
        );
      }
    }
  }
}
