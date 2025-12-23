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

import { LOG_CHARACTER_LIMIT, LOG_TOPICS } from "@bott/constants";
import { ConsoleHandler, getLogger, setup } from "@std/log";
import { budgetedStringify } from "./budgetedStringify.ts";

try {
  setup({
    handlers: {
      console: new ConsoleHandler("NOTSET"),
    },
    loggers: {
      default: {
        level: "NOTSET",
        handlers: ["console"],
      },
    },
  });
} catch {
  // Setup already called
}

/** @internal - for testing only*/
let _loggerTopics = LOG_TOPICS;

/** @internal - for testing only */
export function _setLoggerTopics(topics: string[]) {
  _loggerTopics = topics;
}

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  perf(label?: string): void;
}

const perfTimers = new Map<string, number>();

export const log: Logger = {
  debug(...args: unknown[]): void {
    if (_loggerTopics.includes("debug")) {
      getLogger().debug(
        `${new Date().toLocaleString()} ${
          budgetedStringify(args, LOG_CHARACTER_LIMIT)
        }`,
      );
    }
  },

  info(...args: unknown[]): void {
    if (_loggerTopics.includes("info")) {
      getLogger().info(
        `${new Date().toLocaleString()} ${
          budgetedStringify(args, LOG_CHARACTER_LIMIT)
        }`,
      );
    }
  },

  warn(...args: unknown[]): void {
    if (_loggerTopics.includes("warn")) {
      getLogger().warn(
        `${new Date().toLocaleString()} ${
          budgetedStringify(args, LOG_CHARACTER_LIMIT)
        }`,
      );
    }
  },

  error(...args: unknown[]): void {
    if (_loggerTopics.includes("error")) {
      getLogger().error(
        `${new Date().toLocaleString()} ${
          budgetedStringify(args, LOG_CHARACTER_LIMIT)
        }`,
      );
    }
  },

  perf(label = "default"): void {
    if (!_loggerTopics.includes("perf")) {
      return;
    }

    // If timer exists, end it and log elapsed time
    if (perfTimers.has(label)) {
      const startTime = perfTimers.get(label)!;
      const elapsed = performance.now() - startTime;
      perfTimers.delete(label);
      getLogger().info(
        `PERF ${new Date().toLocaleString()} ${label}: ${elapsed.toFixed(2)}ms`,
      );
    } else {
      // Start a new timer
      perfTimers.set(label, performance.now());
    }
  },
};
