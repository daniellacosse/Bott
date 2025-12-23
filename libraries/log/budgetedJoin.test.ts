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
import { budgetedJoin } from "./budgetedJoin.ts";

const MAX_LENGTH = 20;

Deno.test("budgetedJoin - string smaller than budget", () => {
  const result = budgetedJoin(["short string"], MAX_LENGTH);
  assertEquals(result, "short string");
});

Deno.test("budgetedJoin - string larger than budget uses center truncation", () => {
  const result = budgetedJoin(
    ["1234567890abcdefghij"],
    15,
  );
  // Expected: 15 chars allowed. 1 for ellipsis. 14 for text. 7 start, 7 end.
  // 1234567...defghij
  // Note: budgetedJoin calculates this based on content length.
  // For raw strings: budget 15.
  // "1234567…defghij" is 15 chars.
  assertEquals(result, "1234567…defghij");
  assert(result.length <= 15);
});

Deno.test("budgetedJoin - object smaller than budget", () => {
  const input = { key: "val" };
  const result = budgetedJoin([input], MAX_LENGTH);
  assertEquals(result, JSON.stringify(input));
});

Deno.test("budgetedJoin - object with single long string exceeds budget", () => {
  const input = { key: "this is a long value intended to be truncated" };
  const result = budgetedJoin([input], MAX_LENGTH);

  assert(result.length <= MAX_LENGTH);
  const parsedTruncated = JSON.parse(result);

  assertEquals(parsedTruncated.key.startsWith("thi"), true);
  assertEquals(parsedTruncated.key.endsWith("ated"), true);
  assertEquals(parsedTruncated.key.includes("…"), true);
});

Deno.test("budgetedJoin - nested object with proportional truncation", () => {
  const input = {
    a: "aaaaa aaaaa", // 11
    b: {
      c: "ccccc ccccc", // 11
    },
  };
  const result = budgetedJoin([input], 35);
  const parsed = JSON.parse(result);

  assertEquals(parsed.a.startsWith("aa"), true);
  assertEquals(parsed.a.endsWith("aa"), true);
  assertEquals(parsed.a.length < 11, true);

  assertEquals(parsed.b.c.startsWith("cc"), true);
  assertEquals(parsed.b.c.endsWith("cc"), true);
  assertEquals(parsed.b.c.length < 11, true);
});

Deno.test("budgetedJoin - max depth exceeded", () => {
  let depth = 0;
  type Nested = { next?: Nested | string };
  let obj: Nested | string = "leaf";
  // Create a nested object deeper than 100 levels
  while (depth < 105) {
    obj = { next: obj };
    depth++;
  }

  const result = budgetedJoin([obj], 1000);
  // Should return JSON with "{…}" at depth
  assert(result.includes("{…}"));
});
