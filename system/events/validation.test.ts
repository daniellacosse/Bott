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
  BottEventActionParameterDefinition,
  BottEventActionParameterRecord,
} from "../types.ts";
import { applyParameterDefaults, validateParameters } from "./validation.ts";

Deno.test("applyParameterDefaults", () => {
  const schema: BottEventActionParameterDefinition[] = [
    { name: "p1", type: "string" },
    { name: "p2", type: "number", defaultValue: 42 },
    { name: "p3", type: "boolean", defaultValue: true },
    { name: "p4", type: "string", defaultValue: "default" },
  ];

  const parameters: BottEventActionParameterRecord = {
    p1: "value1",
    p4: "overridden",
  };

  const result = applyParameterDefaults(schema, parameters);

  assertEquals(result.p1, "value1");
  assertEquals(result.p2, 42);
  assertEquals(result.p3, true);
  assertEquals(result.p4, "overridden");
});

Deno.test("validateParameters - Valid parameters", () => {
  const schema: BottEventActionParameterDefinition[] = [
    { name: "name", type: "string", required: true },
    { name: "age", type: "number" },
  ];
  const params: BottEventActionParameterRecord = {
    name: "Alice",
    age: 30,
  };

  validateParameters(schema, params);
});

Deno.test("validateParameters - Missing required parameter", () => {
  const schema: BottEventActionParameterDefinition[] = [
    { name: "name", type: "string", required: true },
  ];
  const params: BottEventActionParameterRecord = {};
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Missing required parameter: name",
  );
});

Deno.test("validateParameters - Invalid type (string expected)", () => {
  const schema: BottEventActionParameterDefinition[] = [
    { name: "name", type: "string" },
  ];
  const params: BottEventActionParameterRecord = {
    name: 123,
  };
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Parameter 'name' must be of type string",
  );
});

Deno.test("validateParameters - Invalid type (number expected)", () => {
  const schema: BottEventActionParameterDefinition[] = [
    { name: "age", type: "number" },
  ];
  const params: BottEventActionParameterRecord = {
    age: "30",
  };
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Parameter 'age' must be of type number",
  );
});

Deno.test("validateParameters - Invalid value (not allowed)", () => {
  const schema: BottEventActionParameterDefinition[] = [
    { name: "color", type: "string", allowedValues: ["red", "blue"] },
  ];
  const params: BottEventActionParameterRecord = {
    color: "green",
  };
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Parameter 'color' has invalid value 'green'. Allowed values: red, blue",
  );
});

Deno.test("validateParameters - Unknown parameter", () => {
  const schema: BottEventActionParameterDefinition[] = [];
  const params: BottEventActionParameterRecord = {
    extra: "value",
  };
  assertThrows(
    () => validateParameters(schema, params),
    Error,
    "Unknown parameter: extra",
  );
});
