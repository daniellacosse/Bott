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
 * Shell logger wrapper that calls the bash logging utilities
 * Provides integration between TypeScript and bash log.sh
 */

import type { Logger } from "./logging.ts";
import loggerSh from "logger.sh" with { type: "text" };

/**
 * Execute a bash log command
 */
async function execLog(fnName: string, ...args: unknown[]): Promise<void> {
  // Use separate arguments to avoid shell injection
  const command = new Deno.Command("bash", {
    args: [
      "-c",
      `source /dev/stdin && "${1}" "$@"`,
      "--",
      fnName,
      ...args.map((arg) => String(arg)),
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });

  const process = command.spawn();
  
  // Write the logger script to stdin
  const writer = process.stdin.getWriter();
  await writer.write(new TextEncoder().encode(loggerSh));
  await writer.close();

  const { stdout, stderr } = await process.output();

  // Write output to console
  if (stdout.length > 0) {
    await Deno.stdout.write(stdout);
  }
  if (stderr.length > 0) {
    await Deno.stderr.write(stderr);
  }
}

/**
 * Shell logger that wraps bash log.sh functions and conforms to Logger interface
 */
export const shellLog: Logger = {
  /**
   * Log debug message via bash logger
   */
  debug(...args: unknown[]): void {
    execLog("debug_log", ...args);
  },

  /**
   * Log info message via bash logger
   */
  info(...args: unknown[]): void {
    execLog("info_log", ...args);
  },

  /**
   * Log warning message via bash logger
   */
  warn(...args: unknown[]): void {
    execLog("warn_log", ...args);
  },

  /**
   * Log error message via bash logger
   */
  error(...args: unknown[]): void {
    execLog("error_log", ...args);
  },

  /**
   * Performance logging - not implemented for shell logger
   */
  perf(_label?: string): void {
    // Shell logger doesn't support perf logging
  },
};
