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
import { allowedTopics } from "./logging.ts";

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
    this.logs = [];
  }
}

export const testHandler: TestHandler = new TestHandler("NOTSET");

export function addLogTopic(topic: string): void {
  allowedTopics.add(topic.toLowerCase().trim());
}

export function setupTestLogger(): void {
  allowedTopics.clear();

  // Enable standard log levels for tests
  addLogTopic("debug");
  addLogTopic("info");
  addLogTopic("warn");
  addLogTopic("error");

  // Manually attach test handler to default logger to avoid setup() conflicts
  const logger = getLogger();
  logger.levelName = "NOTSET";

  // Reset handlers to ensure clean state
  logger.handlers = [
    new ConsoleHandler("NOTSET"),
    testHandler,
  ];
}
