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
  BottActionParameter,
  BottActionParameterEntry,
} from "@bott/actions";

export function applyParameterDefaults(
  schema: BottActionParameter[],
  parameters: BottActionParameterEntry[],
): BottActionParameterEntry[] {
  const mergedParameters = [...parameters];

  for (const field of schema) {
    const existingParam = parameters.find((p) => p.name === field.name);

    if (existingParam === undefined && field.defaultValue !== undefined) {
      mergedParameters.push({
        name: field.name,
        value: field.defaultValue,
      });
    }
  }

  return mergedParameters;
}

export function validateParameters(
  schema: BottActionParameter[],
  parameters: BottActionParameterEntry[],
) {
  // Check for unknown parameters
  for (const param of parameters) {
    if (!schema.find((s) => s.name === param.name)) {
      throw new Error(`Unknown parameter: ${param.name}`);
    }
  }

  for (const field of schema) {
    const param = parameters.find((p) => p.name === field.name);

    if (field.required && param === undefined) {
      throw new Error(`Missing required parameter: ${field.name}`);
    }

    if (param !== undefined) {
      if (field.type === "file") {
        if (!(param.value instanceof File)) {
          throw new Error(
            `Parameter '${field.name}' must be of type file`,
          );
        }
      } else if (
        field.type === "string" ||
        field.type === "number" ||
        field.type === "boolean"
      ) {
        // deno-lint-ignore valid-typeof
        if (typeof param.value !== field.type) {
          throw new Error(
            `Parameter '${field.name}' must be of type ${field.type}`,
          );
        }
      }

      if (
        field.allowedValues && !field.allowedValues.includes(param.value) &&
        field.type !== "file"
      ) {
        throw new Error(
          `Parameter '${field.name}' has invalid value '${param.value}'. Allowed values: ${field.allowedValues.join(", ")
          }`,
        );
      }
    }
  }
}
