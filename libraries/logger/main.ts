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

// Parse LOG_TOPICS environment variable
const allowedTopics = new Set(
  (Deno.env.get("LOG_TOPICS") || "info,warn,error")
    .toLowerCase()
    .split(",")
    .map((topic) => topic.trim())
    .filter((topic) => topic.length > 0),
);

// Setup logger with console handler - allow all levels, filtering is done in wrapper
try {
  setup({
    handlers: {
      console: new ConsoleHandler("DEBUG"),
    },
    loggers: {
      default: {
        level: "DEBUG",
        handlers: ["console"],
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
  perf(...args: unknown[]): void;
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
    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(" ");
}

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

  perf(...args: unknown[]): void {
    if (allowedTopics.has("perf")) {
      // Use INFO level for perf logs
      logger.info(formatArgs(...args));
    }
  },
};
