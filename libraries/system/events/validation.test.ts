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
  BottEventActionParameter,
  BottEventActionParameterEntry,
} from "@bott/events";
import { assertEquals, assertThrows } from "@std/assert";
import { applyParameterDefaults, validateParameters } from "./validation.ts";

Deno.test("applyParameterDefaults", () => {
  const schema: BottEventActionParameter[] = [
    { name: "p1", type: "string" },
    { name: "p2", type: "number", defaultValue: 42 },
    { name: "p3", type: "boolean", defaultValue: true },
    { name: "p4", type: "string", defaultValue: "default" },
  ];

  const parameters: BottEventActionParameterEntry[] = [
    { name: "p1", value: "value1", type: "string" },
    { name: "p4", value: "overridden", type: "string" },
  ];

  const result = applyParameterDefaults(schema, parameters);

  assertEquals(result.length, 4);
  assertEquals(result.find((p) => p.name === "p1")?.value, "value1");
  assertEquals(result.find((p) => p.name === "p2")?.value, 42);
  assertEquals(result.find((p) => p.name === "p3")?.value, true);
  assertEquals(result.find((p) => p.name === "p4")?.value, "overridden");
});

Deno.test("validateParameters - Valid parameters", () => {
  const schema: BottEventActionParameter[] = [
    { name: "name", type: "string", required: true },
    { name: "age", type: "number" },
  ];
  const params: BottEventActionParameterEntry[] = [
    { name: "name", value: "Alice", type: "string" },
    { name: "age", value: 30, type: "number" },
  ];
  validateParameters(schema, params);
});

Deno.test("validateParameters - Missing required parameter", () => {
  const schema: BottEventActionParameter[] = [
    { name: "name", type: "string", required: true },
  ];
  const params: BottEventActionParameterEntry[] = [];
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Missing required parameter: name",
  );
});

Deno.test("validateParameters - Invalid type (string expected)", () => {
  const schema: BottEventActionParameter[] = [
    { name: "name", type: "string" },
  ];
  const params: BottEventActionParameterEntry[] = [
    { name: "name", value: 123, type: "number" },
  ];
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Parameter 'name' must be of type string",
  );
});

Deno.test("validateParameters - Invalid type (number expected)", () => {
  const schema: BottEventActionParameter[] = [
    { name: "age", type: "number" },
  ];
  const params: BottEventActionParameterEntry[] = [
    { name: "age", value: "30", type: "string" },
  ];
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Parameter 'age' must be of type number",
  );
});

Deno.test("validateParameters - Invalid value (not allowed)", () => {
  const schema: BottEventActionParameter[] = [
    { name: "color", type: "string", allowedValues: ["red", "blue"] },
  ];
  const params: BottEventActionParameterEntry[] = [
    { name: "color", value: "green", type: "string" },
  ];
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Parameter 'color' has invalid value 'green'. Allowed values: red, blue",
  );
});

Deno.test("validateParameters - Unknown parameter", () => {
  const schema: BottEventActionParameter[] = [];
  const params: BottEventActionParameterEntry[] = [
    { name: "extra", value: "value", type: "string" },
  ];
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Unknown parameter: extra",
  );
});
