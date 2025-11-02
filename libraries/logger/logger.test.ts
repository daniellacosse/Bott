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
import { log, testHandler } from "./main.ts";

Deno.test("Logger exports expected methods", () => {
  // Verify the logger exports the expected methods
  assertEquals(typeof log.debug, "function");
  assertEquals(typeof log.info, "function");
  assertEquals(typeof log.warn, "function");
  assertEquals(typeof log.error, "function");
  assertEquals(typeof log.perf, "function");
});

Deno.test("Logger methods can be called without errors", () => {
  // These should not throw errors
  log.debug("test debug");
  log.info("test info", { key: "value" });
  log.warn("test warn");
  log.error("test error");
  log.perf("test perf");
});

Deno.test("Logger testHandler captures log messages", () => {
  // Clear previous logs
  testHandler.clear();

  // Log some messages
  log.info("test message 1");
  log.warn("test message 2");
  log.error("test message 3");

  // Verify logs were captured
  assert(testHandler.logs.length >= 3, "Should have captured at least 3 logs");

  const messages = testHandler.logs.map((l) => l.msg);
  assert(
    messages.some((msg) => msg.includes("test message 1")),
    "Should capture info message",
  );
  assert(
    messages.some((msg) => msg.includes("test message 2")),
    "Should capture warn message",
  );
  assert(
    messages.some((msg) => msg.includes("test message 3")),
    "Should capture error message",
  );
});
