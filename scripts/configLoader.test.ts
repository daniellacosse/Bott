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

import { parseYamlConfig, setEnvFromConfig } from "./configLoader.ts";

// Simple assertion helper
function assertEquals<T>(actual: T, expected: T, msg?: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(
      msg ||
        `Assertion failed:\nActual: ${actualStr}\nExpected: ${expectedStr}`,
    );
  }
}

Deno.test("parseYamlConfig - parses simple key-value pairs", () => {
  const yaml = `
GOOGLE_PROJECT_ID: my-project
GOOGLE_PROJECT_LOCATION: us-central1
PORT: 8080
`;

  const result = parseYamlConfig(yaml);

  assertEquals(result, {
    GOOGLE_PROJECT_ID: "my-project",
    GOOGLE_PROJECT_LOCATION: "us-central1",
    PORT: "8080",
  });
});

Deno.test("parseYamlConfig - handles comments", () => {
  const yaml = `
# This is a comment
GOOGLE_PROJECT_ID: my-project
# Another comment
DISCORD_TOKEN: abc123
`;

  const result = parseYamlConfig(yaml);

  assertEquals(result, {
    GOOGLE_PROJECT_ID: "my-project",
    DISCORD_TOKEN: "abc123",
  });
});

Deno.test("parseYamlConfig - handles quoted values", () => {
  const yaml = `
SINGLE_QUOTED: 'value with spaces'
DOUBLE_QUOTED: "another value"
UNQUOTED: simple
`;

  const result = parseYamlConfig(yaml);

  assertEquals(result, {
    SINGLE_QUOTED: "value with spaces",
    DOUBLE_QUOTED: "another value",
    UNQUOTED: "simple",
  });
});

Deno.test("parseYamlConfig - handles empty values", () => {
  const yaml = `
EMPTY_VALUE: 
WITH_VALUE: test
ALSO_EMPTY: ""
`;

  const result = parseYamlConfig(yaml);

  // Empty values should not be included
  assertEquals(result, {
    WITH_VALUE: "test",
  });
});

Deno.test("parseYamlConfig - handles inline comments", () => {
  const yaml = `
VALUE: test # this is a comment
ANOTHER: value
`;

  const result = parseYamlConfig(yaml);

  assertEquals(result, {
    VALUE: "test",
    ANOTHER: "value",
  });
});

Deno.test("parseYamlConfig - handles # inside quoted strings", () => {
  const yaml = `
PASSWORD: "my#password"
TOKEN: 'test#token#123'
URL: "https://example.com#anchor"
COMMENT_AFTER: "value" # comment here
`;

  const result = parseYamlConfig(yaml);

  assertEquals(result, {
    PASSWORD: "my#password",
    TOKEN: "test#token#123",
    URL: "https://example.com#anchor",
    COMMENT_AFTER: "value",
  });
});

Deno.test("setEnvFromConfig - sets environment variables", () => {
  const config = {
    TEST_VAR_1: "value1",
    TEST_VAR_2: "value2",
  };

  // Clear any existing values
  Deno.env.delete("TEST_VAR_1");
  Deno.env.delete("TEST_VAR_2");

  setEnvFromConfig(config);

  assertEquals(Deno.env.get("TEST_VAR_1"), "value1");
  assertEquals(Deno.env.get("TEST_VAR_2"), "value2");

  // Cleanup
  Deno.env.delete("TEST_VAR_1");
  Deno.env.delete("TEST_VAR_2");
});
