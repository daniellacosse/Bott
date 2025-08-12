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

const allowedTopics = new Set(
  (Deno.env.get("LOG_TOPICS") || "info,warn,error")
    .toLowerCase()
    .split(",")
    .map((topic) => topic.trim())
    .filter((topic) => topic.length > 0),
);

type Logger = {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  perf(...args: unknown[]): void;
};

// Export a simple logger object
export const log: Logger = {
  debug(...args: unknown[]): void {
    if (allowedTopics.has("debug")) {
      console.debug(...args);
    }
  },

  info(...args: unknown[]): void {
    if (allowedTopics.has("info")) {
      console.info(...args);
    }
  },

  warn(...args: unknown[]): void {
    if (allowedTopics.has("warn")) {
      console.warn(...args);
    }
  },

  error(...args: unknown[]): void {
    if (allowedTopics.has("error")) {
      console.error(...args);
    }
  },

  perf(...args: unknown[]): void {
    if (allowedTopics.has("perf")) {
      console.log(...args);
    }
  },
};
