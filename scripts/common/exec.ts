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

import { toKebabCase } from "@std/text";

export type FlagRecord = Record<string, string | number | boolean | undefined>;

export interface Executor {
  (
    args: string[],
    options?: { flags?: FlagRecord; capture?: boolean },
  ): Promise<string>;
}

export function createExecutor(commandName: string): Executor {
  return async (
    args: string[],
    options: { flags?: FlagRecord; capture?: boolean } = {},
  ): Promise<string> => {
    const { flags = {}, capture = true } = options;
    const commandArgs = [...args, ...flattenFlags(flags)];

    const command = new Deno.Command(commandName, {
      args: commandArgs,
      stdout: capture ? "piped" : "inherit",
      stderr: capture ? "piped" : "inherit",
    });

    const process = command.spawn();

    if (capture) {
      const { code, stdout, stderr } = await process.output();
      const output = new TextDecoder().decode(stdout).trim();

      if (code !== 0) {
        const errorOutput = new TextDecoder().decode(stderr).trim();
        throw new Error(`${commandName} command failed: ${errorOutput}`);
      }

      return output;
    } else {
      const status = await process.status;
      if (!status.success) {
        throw new Error(
          `${commandName} command failed with exit code ${status.code}`,
        );
      }
      return "";
    }
  };
}

function flattenFlags(flags: FlagRecord): string[] {
  const flattened: string[] = [];
  for (const [key, value] of Object.entries(flags)) {
    if (value === undefined) continue;

    // Determine flag prefix and formatting
    const isShort = key.length === 1;
    const prefix = isShort ? "-" : "--";
    const flagName = isShort ? key : toKebabCase(key);

    if (value === true) {
      flattened.push(`${prefix}${flagName}`);
    } else if (value !== false) {
      flattened.push(`${prefix}${flagName}`, String(value));
    }
  }
  return flattened;
}
