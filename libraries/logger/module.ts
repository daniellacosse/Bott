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

import { BaseHandler, ConsoleHandler, getLogger, setup } from "@std/log";
import { LOGGER_MAX_CHARACTER_LENGTH, LOGGER_TOPICS } from "@bott/constants";

// Parse LOGGER_TOPICS environment variable
const allowedTopics = new Set(LOGGER_TOPICS);

// Simple log record for testing (we can't use LogRecord directly as it has private fields)
export interface TestLogRecord {
  msg: string;
  datetime: Date;
}

// Test handler for capturing logs during testing
// Note: We can't expose ConsoleHandler directly because @std/log handlers don't
// expose their output. This custom handler captures log records for test assertions.
// It accepts all log levels since filtering is already done in the wrapper functions.
class TestHandler extends BaseHandler {
  public logs: TestLogRecord[] = [];

  override log(msg: string): void {
    // Store the raw message for testing
    this.logs.push({
      msg,
      datetime: new Date(),
    });
  }

  clear(): void {
    this.logs = [];
  }
}

// Global test handler instance that can be accessed for testing
// Using "NOTSET" level (lowest) since filtering is done in wrapper, not at handler level
export const testHandler: TestHandler = new TestHandler("NOTSET");

// Helper function for tests to add log topics dynamically
export function addLogTopic(topic: string): void {
  allowedTopics.add(topic.toLowerCase().trim());
}

// Setup logger - allow all levels at handler/logger level since filtering is done in wrapper
try {
  setup({
    handlers: {
      console: new ConsoleHandler("DEBUG"),
      test: testHandler,
    },
    loggers: {
      default: {
        level: "DEBUG", // Allow all levels; filtering based on LOGGER_TOPICS happens in wrapper
        handlers: ["console", "test"],
      },
    },
  });
} catch {
  // Setup may have already been called, that's ok
}

const logger = getLogger();

type Logger = {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  perf(label?: string): void;
};

// Helper function to format log arguments similar to console methods
function formatArgs(...args: unknown[]): string {
  return args.map((arg) => {
    if (typeof arg === "string") {
      return arg;
    }
    if (arg === null) {
      return "null";
    }
    if (arg === undefined) {
      return "undefined";
    }
    try {
      return JSON.stringify(arg, (_key, value) => {
        if (
          typeof value === "string" &&
          value.length > LOGGER_MAX_CHARACTER_LENGTH
        ) {
          return value.substring(0, LOGGER_MAX_CHARACTER_LENGTH) + "…";
        }
        return value;
      });
    } catch {
      return String(arg);
    }
  }).join(" ");
}

// Map to track performance timers (label -> start time)
// Note: Timers not ended will remain in memory, similar to console.time behavior
const perfTimers = new Map<string, number>();

// Export a logger object that maintains the same API
export const log: Logger = {
  debug(...args: unknown[]): void {
    if (allowedTopics.has("debug")) {
      logger.debug(formatArgs(...args));
    }
  },

  info(...args: unknown[]): void {
    if (allowedTopics.has("info")) {
      logger.info(formatArgs(...args));
    }
  },

  warn(...args: unknown[]): void {
    if (allowedTopics.has("warn")) {
      logger.warn(formatArgs(...args));
    }
  },

  error(...args: unknown[]): void {
    if (allowedTopics.has("error")) {
      logger.error(formatArgs(...args));
    }
  },

  perf(label = "default"): void {
    if (!allowedTopics.has("perf")) {
      return;
    }

    // If timer exists, end it and log elapsed time
    if (perfTimers.has(label)) {
      const startTime = perfTimers.get(label)!;
      const elapsed = performance.now() - startTime;
      perfTimers.delete(label);
      logger.info(`PERF ${label}: ${elapsed.toFixed(2)}ms`);
    } else {
      // Start a new timer
      perfTimers.set(label, performance.now());
    }
  },
};
