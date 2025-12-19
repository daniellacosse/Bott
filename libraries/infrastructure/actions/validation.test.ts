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

import { assertEquals, assertThrows } from "@std/assert";
import type {
  BottActionParameter,
  BottActionParameterEntry,
} from "@bott/actions";
import { validateParameters, applyParameterDefaults } from "./validation.ts";

Deno.test("applyParameterDefaults", () => {
  const schema: BottActionParameter[] = [
    { name: "p1", type: "string" },
    { name: "p2", type: "number", defaultValue: 42 },
    { name: "p3", type: "boolean", defaultValue: true },
    { name: "p4", type: "string", defaultValue: "default" },
  ];

  const parameters: BottActionParameterEntry[] = [
    { name: "p1", value: "value1" },
    { name: "p4", value: "overridden" },
  ];

  const result = applyParameterDefaults(schema, parameters);

  assertEquals(result.length, 4);
  assertEquals(result.find((p) => p.name === "p1")?.value, "value1");
  assertEquals(result.find((p) => p.name === "p2")?.value, 42);
  assertEquals(result.find((p) => p.name === "p3")?.value, true);
  assertEquals(result.find((p) => p.name === "p4")?.value, "overridden");
});

Deno.test("validateParameters - Valid parameters", () => {
  const schema: BottActionParameter[] = [
    { name: "name", type: "string", required: true },
    { name: "age", type: "number" },
  ];
  const params: BottActionParameterEntry[] = [
    { name: "name", value: "Alice" },
    { name: "age", value: 30 },
  ];
  validateParameters(schema, params);
});

Deno.test("validateParameters - Missing required parameter", () => {
  const schema: BottActionParameter[] = [
    { name: "name", type: "string", required: true },
  ];
  const params: BottActionParameterEntry[] = [];
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Missing required parameter: name",
  );
});

Deno.test("validateParameters - Invalid type (string expected)", () => {
  const schema: BottActionParameter[] = [
    { name: "name", type: "string" },
  ];
  const params: BottActionParameterEntry[] = [
    { name: "name", value: 123 },
  ];
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Parameter 'name' must be of type string",
  );
});

Deno.test("validateParameters - Invalid type (number expected)", () => {
  const schema: BottActionParameter[] = [
    { name: "age", type: "number" },
  ];
  const params: BottActionParameterEntry[] = [
    { name: "age", value: "30" },
  ];
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Parameter 'age' must be of type number",
  );
});

Deno.test("validateParameters - Invalid value (not allowed)", () => {
  const schema: BottActionParameter[] = [
    { name: "color", type: "string", allowedValues: ["red", "blue"] },
  ];
  const params: BottActionParameterEntry[] = [
    { name: "color", value: "green" },
  ];
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Parameter 'color' has invalid value 'green'. Allowed values: red, blue",
  );
});

Deno.test("validateParameters - Unknown parameter", () => {
  const schema: BottActionParameter[] = [];
  const params: BottActionParameterEntry[] = [
    { name: "extra", value: "value" },
  ];
  // Assuming strict validation, unknown parameters might be ignored or error.
  // Let's implement strict validation for now, or just ignore unknown ones?
  // Usually, extra parameters are just ignored in many systems,
  // but strict validation helps catch typos. Let's decide to ERROR on unknown parameters.
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Unknown parameter: extra",
  );
});
