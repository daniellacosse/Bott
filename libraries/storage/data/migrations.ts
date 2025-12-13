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
 * Validate an identifier (table name or column name) to prevent SQL injection
 * Only allows alphanumeric characters and underscores
 */
function isValidIdentifier(identifier: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}

/**
 * Validate column definition to prevent SQL injection
 * Allows common SQLite types and constraints
 */
function isValidColumnDefinition(definition: string): boolean {
  // Allow common SQLite types and keywords
  const pattern =
    /^(varchar|text|integer|real|blob|datetime|numeric)(\(\d+\))?\s*(primary key|not null|null|unique|default .+)?$/i;
  return pattern.test(definition.trim());
}

/**
 * Check if a column exists in a table
 */
function columnExists(
  db: DatabaseSync,
  tableName: string,
  columnName: string,
): boolean {
  if (!isValidIdentifier(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  if (!isValidIdentifier(columnName)) {
    throw new Error(`Invalid column name: ${columnName}`);
  }

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
  // Validate all inputs to prevent SQL injection
  if (!isValidIdentifier(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  if (!isValidIdentifier(columnName)) {
    throw new Error(`Invalid column name: ${columnName}`);
  }
  if (!isValidColumnDefinition(columnDefinition)) {
    throw new Error(`Invalid column definition: ${columnDefinition}`);
  }

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
