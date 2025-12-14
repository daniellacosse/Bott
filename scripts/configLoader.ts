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
 * Simple YAML configuration loader for flat key-value configs.
 * Supports:
 * - key: value pairs
 * - comments with #
 * - empty lines
 * - string values (quoted and unquoted)
 * - numeric values
 */

export interface LoadOptions {
  configPath: string;
  exampleConfigPath?: string;
}

export async function loadConfig(
  options: LoadOptions,
): Promise<Record<string, string>> {
  try {
    const content = await Deno.readTextFile(options.configPath);
    return parseYamlConfig(content);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound && options.exampleConfigPath) {
      console.warn(
        `Config file ${options.configPath} not found. Please copy ${options.exampleConfigPath} to ${options.configPath} and fill in your values.`,
      );
    }
    throw error;
  }
}

export function parseYamlConfig(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Handle comments - but respect quotes to avoid splitting on # inside strings
    let withoutComment = trimmedLine;
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < trimmedLine.length; i++) {
      const char = trimmedLine[i];
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = "";
      } else if (char === "#" && !inQuotes) {
        withoutComment = trimmedLine.substring(0, i).trim();
        break;
      }
    }

    if (!withoutComment) continue;

    // Parse key: value
    const colonIndex = withoutComment.indexOf(":");
    if (colonIndex === -1) continue;

    const key = withoutComment.substring(0, colonIndex).trim();
    let value = withoutComment.substring(colonIndex + 1).trim();

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.substring(1, value.length - 1);
    }

    // Only set non-empty values
    if (value) {
      result[key] = value;
    }
  }

  return result;
}

export function setEnvFromConfig(config: Record<string, string>): void {
  for (const [key, value] of Object.entries(config)) {
    Deno.env.set(key, value);
  }
}
