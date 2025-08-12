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

// Parse LOG_TOPICS environment variable into a Set of allowed topics
const allowedTopics = new Set(
  (Deno.env.get("LOG_TOPICS") || "info,warn,error")
    .toLowerCase()
    .split(",")
    .map(topic => topic.trim())
    .filter(topic => topic.length > 0)
);

const shouldLog = (topic: string): boolean => {
  return allowedTopics.has(topic.toLowerCase());
};

// Export a simple logger object
export const log = {
  debug(...args: unknown[]): void {
    if (shouldLog("debug")) {
      console.debug(...args);
    }
  },

  info(...args: unknown[]): void {
    if (shouldLog("info")) {
      console.info(...args);
    }
  },

  warn(...args: unknown[]): void {
    if (shouldLog("warn")) {
      console.warn(...args);
    }
  },

  error(...args: unknown[]): void {
    if (shouldLog("error")) {
      console.error(...args);
    }
  },

  perf(...args: unknown[]): void {
    if (shouldLog("perf")) {
      console.log(...args);
    }
  },
};