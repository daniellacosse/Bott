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

import { ConsoleHandler, getLogger, setup } from "@std/log";
import { LOGGER_MAX_CHARACTER_LENGTH, LOGGER_TOPICS } from "@bott/constants";
import { budgetedStringify } from "./budgetedStringify.ts";

// Parse LOGGER_TOPICS environment variable
export const allowedTopics = new Set(LOGGER_TOPICS);

// Setup logger - allow all levels at handler/logger level since filtering is done in wrapper
try {
  setup({
    handlers: {
      console: new ConsoleHandler("NOTSET"),
    },
    loggers: {
      default: {
        level: "NOTSET", // Allow all levels; filtering based on LOGGER_TOPICS happens in wrapper
        handlers: ["console"],
      },
    },
  });
} catch {
  // Setup may have already been called, that's ok
}

export type Logger = {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  perf(label?: string): void;
};

/**
 * Helper function to format log arguments similar to console methods
 */
export function formatArgs(...args: unknown[]): string {
  return budgetedStringify(args, LOGGER_MAX_CHARACTER_LENGTH);
}

// Map to track performance timers (label -> start time)
const perfTimers = new Map<string, number>();

// Export a logger object that maintains the same API
export const log: Logger = {
  debug(...args: unknown[]): void {
    if (allowedTopics.has("debug")) {
      getLogger().debug(formatArgs(...args));
    }
  },

  info(...args: unknown[]): void {
    if (allowedTopics.has("info")) {
      getLogger().info(formatArgs(...args));
    }
  },

  warn(...args: unknown[]): void {
    if (allowedTopics.has("warn")) {
      getLogger().warn(formatArgs(...args));
    }
  },

  error(...args: unknown[]): void {
    if (allowedTopics.has("error")) {
      getLogger().error(formatArgs(...args));
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
      getLogger().info(`PERF ${label}: ${elapsed.toFixed(2)}ms`);
    } else {
      // Start a new timer
      perfTimers.set(label, performance.now());
    }
  },
};
