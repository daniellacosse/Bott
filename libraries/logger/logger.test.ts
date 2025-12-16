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

import { assert } from "@std/assert";
import { clearTestLogs, setupTestLogger, testLogs } from "./module.ts";
import { log } from "./logger.ts";

// Setup test logger
setupTestLogger();

Deno.test("Logger exports expected methods", () => {
  // Verify the logger exports the expected methods
  assert(typeof log.debug === "function");
  assert(typeof log.info === "function");
  assert(typeof log.warn === "function");
  assert(typeof log.error === "function");
  assert(typeof log.perf === "function");
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

Deno.test("Logger testHandler captures log messages", async () => {
  // Clear previous logs
  clearTestLogs();

  // Log some messages
  log.info("test message 1");
  log.warn("test message 2");
  log.warn("warn message");
  log.error("error message");

  // Wait for async logging
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Verify logs were captured
  assert(testLogs.length >= 3, "Should have captured at least 3 logs");

  const messages = testLogs.map((l) => l.msg);
  assert(
    messages.some((msg) => msg.includes("test message 1")),
    "Should capture info message",
  );
  assert(
    messages.some((msg) => msg.includes("test message 2")),
    "Should capture warn message",
  );
  assert(
    messages.some((msg) => msg.includes("error message")),
    "Should capture error message",
  );
});

Deno.test("Logger perf works like console.time/timeEnd", async () => {
  // Clear previous logs
  clearTestLogs();

  // Start timer
  log.perf("timer1");

  // Simulate some work
  await new Promise((resolve) => setTimeout(resolve, 50));

  // End timer
  log.perf("timer1");

  // Wait for async logging
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Check that a timing message was logged
  const perfLog = testLogs.find((l) => l.level === "PERF" && l.msg.includes("timer1:"));

  assert(perfLog, "Should log timing message");
  assert(perfLog!.msg.includes("ms"), "Should include 'ms' in message");

  // Extract the time value and verify it's reasonable
  // Msg format: '["timer1: 123.45ms"]' (JSON array string)
  const timeMatch = perfLog!.msg.match(/timer1: ([\d.]+)ms/);
  assert(timeMatch, "Should match format 'timer1: XXms'");

  const elapsedTime = parseFloat(timeMatch![1]);
  assert(
    elapsedTime >= 40 && elapsedTime <= 150,
    `Elapsed time should be ~50ms, got ${elapsedTime}ms`,
  );
});

Deno.test("Logger perf supports multiple concurrent timers", async () => {
  // Clear previous logs
  clearTestLogs();

  // Start multiple timers
  log.perf("timer-a");
  log.perf("timer-b");

  await new Promise((resolve) => setTimeout(resolve, 30));

  // End in different order
  log.perf("timer-b");
  log.perf("timer-a");

  // Wait for async logging
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Check that both timing messages were logged
  const perfMessageA = testLogs.find((l) => l.level === "PERF" && l.msg.includes("timer-a:"));
  const perfMessageB = testLogs.find((l) => l.level === "PERF" && l.msg.includes("timer-b:"));

  assert(perfMessageA, "Should log timer-a with PERF level");
  assert(perfMessageB, "Should log timer-b with PERF level");
});

Deno.test("Logger perf uses default label when none provided", async () => {
  // Clear previous logs
  clearTestLogs();

  // Start and end timer without label
  log.perf();
  log.perf();

  // Wait for async logging
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Check that default label was used
  const perfMessage = testLogs.find((l) => l.level === "PERF" && l.msg.includes("default:"));

  assert(perfMessage, "Should log with 'default' label and PERF level");
});
