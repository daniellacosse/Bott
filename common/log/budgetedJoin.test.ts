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
  const keys = Object.keys(parsedTruncated);
  const key = keys[0];
  const val = parsedTruncated[key];

  assertEquals(val.startsWith("thi"), true);
  assertEquals(val.endsWith("ated"), true);
  assertEquals(val.includes("…"), true);
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

Deno.test("budgetedJoin - bias values over keys", () => {
  // Input with long key and small value
  const input = { "thisIsAVeryLongKeyThatCouldBeTruncated": "value" };
  // Budget:
  // Full size:
  // Key: 38 chars + quotes + colon = 41?? (JSON is "key":) -> 41.
  // Value: "value" (5) + quotes = 7.
  // {} = 2.
  // Total = 50.

  // Set budget to 30.
  // Expectation: Key should be truncated significantly to allow "value" to show.
  // "value" needs 7 chars.
  // Key needs 41.
  // Available 28 (after {}).
  // If we prioritize value, value gets 7.
  // Key can get 21.

  const result = budgetedJoin([input], 30);
  console.log("Values Over Keys Result:", result);

  const parsed = JSON.parse(result);
  const keys = Object.keys(parsed);
  const key = keys[0];
  const val = parsed[key];

  assertEquals(val, "value"); // Value preserved
  assert(key.includes("…")); // Key truncated
  assert(key.length < 35);
});

Deno.test("budgetedJoin - bias higher layer values (small) over lower layer (large)", () => {
  const input = [
    "short", // size 5
    {
      nested:
        "this is a very long string that is nested deep inside the object and should take the hit",
    },
  ];

  const result = budgetedJoin(input, 40);
  console.log("Higher Layer Bias Result:", result);

  // Expect "short" to be present fully.
  assert(result.includes("short"));
  assert(!result.includes("s…"));

  // Expect object to be present but truncated
  assert(result.includes("{"));
  assert(result.includes("…"));
});
