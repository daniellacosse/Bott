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

import { ENV, OUTPUT_ROOT } from "@bott/constants";
import { ensureDirSync } from "@std/fs";
import { join } from "@std/path";

const LOG_DIR = join(OUTPUT_ROOT, "logs");
const LOG_FILE = join(LOG_DIR, "bott.log");

// Only enable JSONL logging in local environment
const ENABLE_JSONL = ENV === "local";

if (ENABLE_JSONL) {
  ensureDirSync(LOG_DIR);

  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  function writeToLog(level: string, ...args: unknown[]) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: args.map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      ).join(" "),
    };

    try {
      Deno.writeTextFileSync(
        LOG_FILE,
        JSON.stringify(logEntry) + "\n",
        { append: true },
      );
    } catch (_error) {
      // Silently fail if unable to write to log file
    }
  }

  console.debug = (...args: unknown[]) => {
    originalConsole.debug(...args);
    writeToLog("debug", ...args);
  };

  console.info = (...args: unknown[]) => {
    originalConsole.info(...args);
    writeToLog("info", ...args);
  };

  console.warn = (...args: unknown[]) => {
    originalConsole.warn(...args);
    writeToLog("warn", ...args);
  };

  console.error = (...args: unknown[]) => {
    originalConsole.error(...args);
    writeToLog("error", ...args);
  };

  console.info(`JSONL logging enabled: ${LOG_FILE}`);
}
