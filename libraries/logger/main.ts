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

import { ConsoleHandler, getLogger, type LevelName, setup } from "@std/log";

// Parse LOG_TOPICS environment variable
const allowedTopics = new Set(
  (Deno.env.get("LOG_TOPICS") || "info,warn,error")
    .toLowerCase()
    .split(",")
    .map((topic) => topic.trim())
    .filter((topic) => topic.length > 0),
);

// Determine minimum log level from allowed topics
let minLevel: LevelName = "NOTSET";
if (allowedTopics.has("debug")) {
  minLevel = "DEBUG";
} else if (allowedTopics.has("info")) {
  minLevel = "INFO";
} else if (allowedTopics.has("warn")) {
  minLevel = "WARN";
} else if (allowedTopics.has("error")) {
  minLevel = "ERROR";
}

// Setup logger with console handler
setup({
  handlers: {
    console: new ConsoleHandler(minLevel),
  },
  loggers: {
    default: {
      level: minLevel,
      handlers: ["console"],
    },
  },
});

const logger = getLogger();

type Logger = {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  perf(...args: unknown[]): void;
};

// Export a logger object that maintains the same API
export const log: Logger = {
  debug(...args: unknown[]): void {
    if (allowedTopics.has("debug")) {
      logger.debug(() => args.map((arg) => String(arg)).join(" "));
    }
  },

  info(...args: unknown[]): void {
    if (allowedTopics.has("info")) {
      logger.info(() => args.map((arg) => String(arg)).join(" "));
    }
  },

  warn(...args: unknown[]): void {
    if (allowedTopics.has("warn")) {
      logger.warn(() => args.map((arg) => String(arg)).join(" "));
    }
  },

  error(...args: unknown[]): void {
    if (allowedTopics.has("error")) {
      logger.error(() => args.map((arg) => String(arg)).join(" "));
    }
  },

  perf(...args: unknown[]): void {
    if (allowedTopics.has("perf")) {
      // Use INFO level for perf logs
      logger.info(() => args.map((arg) => String(arg)).join(" "));
    }
  },
};
