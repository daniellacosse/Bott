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

import { assertEquals } from "@std/assert";
import { smartTruncate } from "./smartTruncate.ts";

const MAX_LENGTH = 20;

Deno.test("smartTruncate - string smaller than budget", () => {
  const result = smartTruncate("short string", MAX_LENGTH);
  assertEquals(result, "short string");
});

Deno.test("smartTruncate - string larger than budget", () => {
  const result = smartTruncate(
    "this is a very long string that should be truncated",
    MAX_LENGTH,
  );
  // Strict budget 20: 18 chars for string (incl quotes), so content 18-2=16?
  // No, shadow logic: string size = len + 2.
  // applyBudget: if string, overhead 2. maxContent = 18.
  // safeLen = 17. Result "..." len 18.
  // 18 + 2 = 20. Fits.
  // "this is a very lo" is 17 chars.
  assertEquals(result, "this is a very lo…");
});

Deno.test("smartTruncate - object smaller than budget", () => {
  const input = { key: "val" };
  const result = smartTruncate(input, MAX_LENGTH);
  assertEquals(result, input);
});

Deno.test("smartTruncate - object with single long string exceeds budget", () => {
  // Budget 20. Total string length ~40. Ratio ~0.5.
  // "long value ... " should be truncated to ~50%
  const input = { key: "this is a long value intended to be truncated" };
  const result = smartTruncate(input, MAX_LENGTH) as Record<string, string>;

  // Basic check for truncation
  const originalLen = input.key.length;
  const newLen = result.key.length;

  if (newLen >= originalLen) {
    throw new Error(`Expected truncation: ${newLen} >= ${originalLen}`);
  }

  assertEquals(result.key.endsWith("…"), true);
});

Deno.test("smartTruncate - nested object with proportional truncation", () => {
  const input = {
    a: "aaaaa aaaaa", // 11
    b: {
      c: "ccccc ccccc", // 11
    },
  };
  // Total size 43. Budget 35.
  // Should truncate.

  const result = smartTruncate(input, 35) as { a: string; b: { c: string } };

  // "xxxx..." -> 4 chars from original + ellipsis

  assertEquals(result.a.startsWith("aaaa"), true);
  assertEquals(result.a.length < 11, true);

  assertEquals(result.b.c.startsWith("cccc"), true);
  assertEquals(result.b.c.length < 11, true);
});

Deno.test("smartTruncate - circular reference", () => {
  const obj: Record<string, unknown> = { a: "test" };
  obj.self = obj;

  const result = smartTruncate(obj, 100) as Record<string, unknown>;
  assertEquals(result.a, "test");
  assertEquals(result.self, "[Circular]");
});

Deno.test("smartTruncate - max depth exceeded", () => {
  let depth = 0;
  type Nested = { next?: Nested | string };
  let obj: Nested | string = "leaf";
  // Create a nested object deeper than 100 levels
  while (depth < 105) {
    obj = { next: obj };
    depth++;
  }

  const result = smartTruncate(obj, 1000);
  // The structure should be truncated with "[Max Depth]" at the limit.
  assertEquals(typeof result, "object");
});
