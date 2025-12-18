
import {
  assertThrows,
} from "@std/assert";
import type {
  BottActionParameter,
  BottActionParameterEntry,
} from "@bott/model";
// Function to be tested
import { _validateParameters } from "./validation.ts";

Deno.test("validateParameters - Valid parameters", () => {
  const schema: BottActionParameter[] = [
    { name: "name", type: "string", required: true },
    { name: "age", type: "number" },
  ];
  const params: BottActionParameterEntry[] = [
    { name: "name", value: "Alice" },
    { name: "age", value: 30 },
  ];
  _validateParameters(schema, params);
});

Deno.test("validateParameters - Missing required parameter", () => {
  const schema: BottActionParameter[] = [
    { name: "name", type: "string", required: true },
  ];
  const params: BottActionParameterEntry[] = [];
  assertThrows(
    () => _validateParameters(schema, params),
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
    () => _validateParameters(schema, params),
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
    () => _validateParameters(schema, params),
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
    () => _validateParameters(schema, params),
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
    () => _validateParameters(schema, params),
    Error,
    "Unknown parameter: extra",
  );
});
