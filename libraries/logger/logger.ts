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

import { join, fromFileUrl, dirname } from "@std/path";
import { LOGGER_MAX_CHARACTER_LENGTH } from "@bott/constants";
import { budgetedStringify } from "./budgetedStringify.ts";

const shellLogger = Deno.readTextFileSync(
  join(dirname(fromFileUrl(import.meta.url)), "logger.sh")
);

const command = new Deno.Command("bash", {
  stdin: "piped",
  stdout: "inherit",
  stderr: "inherit",
});
const process = command.spawn();
let writer = process.stdin.getWriter();
const encoder = new TextEncoder();

// For testing
export function _setLogWriter(newWriter: WritableStreamDefaultWriter<Uint8Array>) {
  writer = newWriter;
}

// Initialize logger by writing the script content once
try {
  await writer.write(encoder.encode(shellLogger + "\n"));
} catch (err) {
  console.error("[CRITICAL] Failed to initialize logger script:", err);
}


async function writeLog(fnName: string, ...args: unknown[]): Promise<void> {
  const bundledArguments = budgetedStringify(args, LOGGER_MAX_CHARACTER_LENGTH)
    .replace(/'/g, "'\\''");

  try {
    await writer.write(encoder.encode(`${fnName} '${bundledArguments}'\n`));
  } catch (error) {
    console.error("[CRITICAL] Logger pipe failed:", error);
  }
}

const _perfTimers = new Map<string, number>();

export const log = {
  debug(...args: unknown[]): void {
    writeLog("debug_log", ...args);
  },

  info(...args: unknown[]): void {
    writeLog("info_log", ...args);
  },

  warn(...args: unknown[]): void {
    writeLog("warn_log", ...args);
  },

  error(...args: unknown[]): void {
    writeLog("error_log", ...args);
  },

  perf(id = "default"): void {
    if (_perfTimers.has(id)) {
      const startTime = _perfTimers.get(id)!;
      const elapsed = performance.now() - startTime;
      _perfTimers.delete(id);

      const message = `${id}: ${elapsed.toFixed(2)}ms`;
      writeLog("perf_log", message);
    } else {
      _perfTimers.set(id, performance.now());
    }
  },
};
