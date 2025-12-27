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
 * OTLP to JSONL Converter
 *
 * This tool acts as an OTLP receiver that accepts OpenTelemetry logs
 * and writes them to JSONL files for local development.
 *
 * Usage:
 *   deno run --allow-net --allow-write --allow-read --allow-env tools/otlp-to-jsonl.ts
 *
 * The tool will:
 * 1. Start an HTTP server on port 4318 (default OTLP HTTP port)
 * 2. Accept OTLP log exports
 * 3. Write logs to .output/logs/local/{timestamp}_{sessionid}.log in JSONL format
 */

import { ensureDirSync } from "@std/fs";
import { join } from "@std/path";

const OUTPUT_ROOT = Deno.env.get("OUTPUT_ROOT") || "./.output";
const SESSION_ID = crypto.randomUUID();
const START_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");

const LOG_DIR = join(OUTPUT_ROOT, "logs", "local");
const LOG_FILE = join(LOG_DIR, `${START_TIMESTAMP}_${SESSION_ID}.log`);

// Ensure log directory exists
ensureDirSync(LOG_DIR);

console.info(`OTLP to JSONL converter starting...`);
console.info(`Writing logs to: ${LOG_FILE}`);
console.info(`Listening on: http://localhost:4318`);

function writeLog(entry: Record<string, unknown>) {
  try {
    Deno.writeTextFileSync(
      LOG_FILE,
      JSON.stringify(entry) + "\n",
      { append: true },
    );
  } catch (error) {
    console.error("Failed to write log:", error);
  }
}

// Handle OTLP HTTP requests
async function handleOTLP(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // OTLP logs endpoint
  if (url.pathname === "/v1/logs" && request.method === "POST") {
    try {
      const body = await request.json();

      // Parse OTLP log format
      // Reference: https://opentelemetry.io/docs/specs/otlp/#otlphttp
      if (body.resourceLogs) {
        for (const resourceLog of body.resourceLogs) {
          for (const scopeLog of resourceLog.scopeLogs || []) {
            for (const logRecord of scopeLog.logRecords || []) {
              // Convert OTLP log record to JSONL format
              const logEntry: Record<string, unknown> = {
                ts: new Date(
                  Number(logRecord.timeUnixNano) / 1000000,
                ).toISOString(),
                l: getSeverityLevel(logRecord.severityNumber),
                m: logRecord.body?.stringValue || JSON.stringify(
                  logRecord.body,
                ),
              };

              // Add attributes if present
              if (logRecord.attributes && logRecord.attributes.length > 0) {
                const attrs: Record<string, unknown> = {};
                for (const attr of logRecord.attributes) {
                  attrs[attr.key] = attr.value?.stringValue ||
                    attr.value?.intValue ||
                    attr.value?.boolValue ||
                    attr.value;
                }
                logEntry.attrs = attrs;
              }

              writeLog(logEntry);
            }
          }
        }
      }

      return new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error processing OTLP logs:", error);
      return new Response(
        JSON.stringify({ error: "Failed to process logs" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  return new Response("Not Found", { status: 404 });
}

function getSeverityLevel(severityNumber?: number): string {
  if (!severityNumber) return "i";

  // OTLP severity numbers: https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber
  if (severityNumber >= 1 && severityNumber <= 4) return "d"; // TRACE, DEBUG
  if (severityNumber >= 5 && severityNumber <= 12) return "i"; // INFO
  if (severityNumber >= 13 && severityNumber <= 16) return "w"; // WARN
  if (severityNumber >= 17) return "e"; // ERROR, FATAL

  return "i";
}

// Start server
Deno.serve(
  {
    port: 4318,
    onListen: ({ port }) => {
      console.info(`✓ OTLP receiver ready on port ${port}`);
      console.info(
        `  Set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:${port} in your app`,
      );
    },
  },
  handleOTLP,
);
