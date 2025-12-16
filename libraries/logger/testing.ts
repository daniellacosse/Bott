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

import { BaseHandler, ConsoleHandler, getLogger } from "@std/log";
import { _setLoggerTopics } from "./logger.ts";

// Simple log record for testing
export interface TestLogRecord {
  msg: string;
  datetime: Date;
}

// Test handler for capturing logs during testing
export class TestHandler extends BaseHandler {
  public logs: TestLogRecord[] = [];

  override log(msg: string): void {
    this.logs.push({
      msg,
      datetime: new Date(),
    });
  }

  clear(): void {
    this.logs.length = 0;
  }
}

export const testHandler: TestHandler = new TestHandler("NOTSET");
export const testLogs = testHandler.logs;

export function clearTestLogs(): void {
  testHandler.clear();
}

export function setupTestLogger(): void {
  _setLoggerTopics(["debug", "info", "warn", "error", "perf"]);

  const logger = getLogger();

  logger.levelName = "NOTSET";
  logger.handlers = [
    new ConsoleHandler("NOTSET"),
    testHandler,
  ];
}
