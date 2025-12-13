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
  log.perf("test perf start");
  log.perf("test perf start"); // This call ends the timer and logs elapsed time
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

Deno.test("Logger perf works like console.time/timeEnd", async () => {
  // Clear previous logs
  testHandler.clear();

  // Start timer
  log.perf("timer1");

  // Simulate some work
  await new Promise((resolve) => setTimeout(resolve, 50));

  // End timer
  log.perf("timer1");

  // Check that a timing message was logged
  const messages = testHandler.logs.map((l) => l.msg);
  const perfMessage = messages.find((msg) => msg.includes("timer1:"));

  assert(perfMessage, "Should log timing message");
  assert(perfMessage!.includes("ms"), "Should include 'ms' in message");

  // Extract the time value and verify it's reasonable
  const timeMatch = perfMessage!.match(/timer1: ([\d.]+)ms/);
  assert(timeMatch, "Should match format 'label: XXms'");

  const elapsedTime = parseFloat(timeMatch![1]);
  assert(
    elapsedTime >= 40 && elapsedTime <= 150,
    `Elapsed time should be ~50ms, got ${elapsedTime}ms`,
  );
});

Deno.test("Logger perf supports multiple concurrent timers", async () => {
  // Clear previous logs
  testHandler.clear();

  // Start multiple timers
  log.perf("timer-a");
  log.perf("timer-b");

  await new Promise((resolve) => setTimeout(resolve, 30));

  // End in different order
  log.perf("timer-b");
  log.perf("timer-a");

  // Check that both timing messages were logged
  const messages = testHandler.logs.map((l) => l.msg);

  const perfMessageA = messages.find((msg) => msg.includes("timer-a:"));
  const perfMessageB = messages.find((msg) => msg.includes("timer-b:"));

  assert(perfMessageA, "Should log timer-a");
  assert(perfMessageB, "Should log timer-b");
});

Deno.test("Logger perf uses default label when none provided", () => {
  // Clear previous logs
  testHandler.clear();

  // Start and end timer without label
  log.perf();
  log.perf();

  // Check that default label was used
  const messages = testHandler.logs.map((l) => l.msg);
  const perfMessage = messages.find((msg) => msg.includes("default:"));

  assert(perfMessage, "Should log with 'default' label");
});
