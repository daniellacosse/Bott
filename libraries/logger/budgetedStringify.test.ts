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

import { assert, assertEquals } from "@std/assert";
import { budgetedStringify } from "./budgetedStringify.ts";

const MAX_LENGTH = 20;

Deno.test("budgetedStringify - string smaller than budget", () => {
  const result = budgetedStringify("short string", MAX_LENGTH);
  assertEquals(result, JSON.stringify("short string"));
});

Deno.test("budgetedStringify - string larger than budget", () => {
  const result = budgetedStringify(
    "this is a very long string that should be truncated",
    MAX_LENGTH,
  );
  // Expect JSON string of truncated value
  // "this is a very lo…" (length 18 chars, + 2 quotes = 20)
  // Check if it ends with quote
  assert(result.endsWith('…"'));
  assert(result.length <= MAX_LENGTH);
});

Deno.test("budgetedStringify - object smaller than budget", () => {
  const input = { key: "val" };
  const result = budgetedStringify(input, MAX_LENGTH);
  assertEquals(result, JSON.stringify(input));
});

Deno.test("budgetedStringify - object with single long string exceeds budget", () => {
  const input = { key: "this is a long value intended to be truncated" };
  const result = budgetedStringify(input, MAX_LENGTH);

  assert(result.length <= MAX_LENGTH);
  // {"key":"..."}
  // Check structure
  // Replacing ellipsis might break JSON validity if inside string
  // Actually result is valid JSON string with ellipsis char inside strings
  const parsedTruncated = JSON.parse(result);
  assertEquals(parsedTruncated.key.endsWith("…"), true);
});

Deno.test("budgetedStringify - nested object with proportional truncation", () => {
  const input = {
    a: "aaaaa aaaaa", // 11
    b: {
      c: "ccccc ccccc", // 11
    },
  };
  // Total size 43. Budget 35.
  const result = budgetedStringify(input, 35);
  const parsed = JSON.parse(result);

  assertEquals(parsed.a.startsWith("aaaa"), true);
  assertEquals(parsed.a.length < 11, true);

  assertEquals(parsed.b.c.startsWith("cccc"), true);
  assertEquals(parsed.b.c.length < 11, true);
});

Deno.test("budgetedStringify - max depth exceeded", () => {
  let depth = 0;
  type Nested = { next?: Nested | string };
  let obj: Nested | string = "leaf";
  // Create a nested object deeper than 100 levels
  while (depth < 105) {
    obj = { next: obj };
    depth++;
  }

  const result = budgetedStringify(obj, 1000);
  // Should return JSON with "{…}" at depth
  assert(result.includes("{…}"));
});
