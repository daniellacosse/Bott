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

import type { DatabaseSync } from "node:sqlite";
import { log } from "@bott/logger";

/**
 * Check if a column exists in a table
 */
function columnExists(
  db: DatabaseSync,
  tableName: string,
  columnName: string,
): boolean {
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
  const columns = stmt.all() as Array<{ name: string }>;
  return columns.some((col) => col.name === columnName);
}

/**
 * Safely add a column to a table if it doesn't already exist
 * This prevents duplicate column errors when running against an existing database
 */
export function addColumnIfNotExists(
  db: DatabaseSync,
  tableName: string,
  columnName: string,
  columnDefinition: string,
): void {
  if (!columnExists(db, tableName, columnName)) {
    try {
      const sql =
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`;
      db.exec(sql);
      log.debug(
        `Added column ${columnName} to table ${tableName}`,
      );
    } catch (error) {
      log.warn(
        `Failed to add column ${columnName} to table ${tableName}: ${error}`,
      );
      throw error;
    }
  }
}

/**
 * Apply any schema migrations needed for existing databases
 * This ensures that older database schemas are updated to the current version
 */
export function applyMigrations(_db: DatabaseSync): void {
  // Currently no migrations needed - all columns are created with tables
  // This function is here for future schema evolution
  // Example usage:
  // addColumnIfNotExists(_db, 'spaces', 'new_field', 'text');

  log.debug("Schema migrations applied successfully");
}
