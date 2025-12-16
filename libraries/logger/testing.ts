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

import { _setLogWriter } from "./logger.ts";

export interface LogTestRecord {
  level: string;
  msg: string;
}

export let testLogs: LogTestRecord[] = [];

export function clearTestLogs(): void {
  testLogs = [];
}

export function setupTestLogger(): void {
  // Capture logs via a custom WritableStream
  const logStream = new WritableStream<Uint8Array>({
    write(chunk) {
      const text = new TextDecoder().decode(chunk);
      // Format is "fnName 'arg1' 'arg2' ..."
      const parts = text.trim().match(/^(\w+) '(.*)'$/);
      if (parts) {
        const level = parts[1].replace("_log", "").toUpperCase();
        // Simple unescape: replace ' with nothing since we want raw content, 
        // or actually unescape bash single quotes: '\'' -> '
        const msg = parts[2].replace(/'\\''/g, "'");
        testLogs.push({ level, msg });
      }
    },
  });

  _setLogWriter(logStream.getWriter());
}
