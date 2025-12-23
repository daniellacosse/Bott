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
import { magenta } from "@std/fmt/colors";
import { parse as parseJsonc } from "@std/jsonc";
import { ConsoleHandler, getLogger, type LogRecord, setup } from "@std/log";
import { dirname, fromFileUrl, relative, resolve } from "@std/path";
import { budgetedJoin } from "./budgetedJoin.ts";

/** @internal - for testing only*/
let _loggerTopics = LOG_TOPICS;

/** @internal - for testing only */
export function _setLoggerTopics(topics: string[]) {
  _loggerTopics = topics;
}

/** @internal - for testing only */
export const formatter = (record: LogRecord): string => {
  const caller = getDenoCaller();
  const timestamp = record.datetime.toLocaleString();

  const metadata = [
    `<ts: ${timestamp}>`,
  ];
  if (caller) metadata.push(`<c: ${caller}>`);

  if (record.loggerName === "perf") {
    return magenta(`PERF ${metadata.join(" ")} ${record.msg}`);
  }

  const allArgs = record.msg ? [record.msg, ...record.args] : record.args;

  return `${record.levelName} ${metadata.join(" ")} ${
    budgetedJoin(allArgs, LOG_CHARACTER_LIMIT)
  }`;
};

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  perf(label?: string): void;
}

// Setup logger
const ROOT_DENO_CONFIG = resolve(Deno.cwd(), "deno.jsonc");

const perfTimers = new Map<string, number>();
const importMap = new Map<string, string>();

{
  let configContent = "";

  try {
    configContent = Deno.readTextFileSync(ROOT_DENO_CONFIG);
  } catch {
    // ignore
  }

  if (configContent) {
    const config = parseJsonc(configContent) as {
      imports?: Record<string, string>;
    };
    if (config.imports) {
      for (const [alias, path] of Object.entries(config.imports)) {
        // We only care about local paths
        if (path.startsWith(".")) {
          let cleanPath = path;
          if (cleanPath.startsWith("./")) cleanPath = cleanPath.slice(2);

          // If it points to a file like module.ts, we map the PARENT dir to the alias
          if (cleanPath.match(/\.(ts|js|jsonc?)$/)) {
            cleanPath = dirname(cleanPath);
          }

          // Store mapping: libraries/log -> @bott/log
          importMap.set(cleanPath, alias);
        }
      }
    }
  }
}

try {
  setup({
    handlers: {
      console: new ConsoleHandler("NOTSET", {
        formatter,
      }),
    },
    loggers: {
      default: {
        level: "NOTSET",
        handlers: ["console"],
      },
      perf: {
        level: "NOTSET",
        handlers: ["console"],
      },
    },
  });
} catch {
  // Setup already called
}

export const log: Logger = {
  debug(...args: unknown[]): void {
    if (_loggerTopics.includes("debug")) {
      getLogger("default").debug("", ...args);
    }
  },

  info(...args: unknown[]): void {
    if (_loggerTopics.includes("info")) {
      getLogger("default").info("", ...args);
    }
  },

  warn(...args: unknown[]): void {
    if (_loggerTopics.includes("warn")) {
      getLogger("default").warn("", ...args);
    }
  },

  error(...args: unknown[]): void {
    if (_loggerTopics.includes("error")) {
      getLogger("default").error("", ...args);
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

      getLogger("perf").info(`${label}: ${elapsed.toFixed(2)}ms`);
    } else {
      // Start a new timer
      perfTimers.set(label, performance.now());
    }
  },
};

// Common
function getDenoCaller(): string | undefined {
  // @ts-ignore Preserve original stack trace limit
  const originalLimit = Error.stackTraceLimit;
  // @ts-ignore Inspect deeper into the stack trace
  Error.stackTraceLimit = 50;
  const stack = new Error().stack;
  // @ts-ignore Reset the stack trace limit
  Error.stackTraceLimit = originalLimit;

  if (!stack) return;

  const lines = stack.split("\n");
  const cwd = Deno.cwd();

  // Find the first frame that isn't part of the logger or standard library
  for (const line of lines) {
    if (
      line.includes("/libraries/log/log.ts") ||
      line.includes("deno.land/std") ||
      line.includes("jsr:@std")
    ) {
      continue;
    }

    const match = line.match(/(?:at\s+)?(file:\/\/[^:]+):(\d+)(?::(\d+))?/);
    if (match) {
      try {
        const filePath = fromFileUrl(match[1]);
        const relativePath = relative(cwd, filePath);

        // Try to resolve using import map
        let displayedPath = relativePath;
        let bestMatchLength = 0;

        for (const [pathPrefix, alias] of importMap) {
          if (relativePath.startsWith(pathPrefix)) {
            const remainder = relativePath.slice(pathPrefix.length);

            if (pathPrefix === "." || pathPrefix === "") continue;

            if (remainder.startsWith("/") || pathPrefix.endsWith("/")) {
              if (pathPrefix.length > bestMatchLength) {
                bestMatchLength = pathPrefix.length;
                // @bott/log + /log.ts -> @bott/log/log.ts
                displayedPath = alias +
                  (remainder.startsWith("/") ? remainder : "/" + remainder);
              }
            } else if (remainder === "") {
              // exact match (unlikely for a directory vs file, but possible)
              if (pathPrefix.length > bestMatchLength) {
                bestMatchLength = pathPrefix.length;
                displayedPath = alias;
              }
            }
          }
        }

        if (bestMatchLength > 0) {
          return `${displayedPath}:${match[2]}`;
        } else {
          return `@${relativePath}:${match[2]}`;
        }
      } catch {
        continue;
      }
    }
  }
}
