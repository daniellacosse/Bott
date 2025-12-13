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
  const trimmed = definition.trim();

  // Pattern: TYPE[(size)] [CONSTRAINT1] [CONSTRAINT2] ...
  // TYPE: varchar, text, integer, real, blob, datetime, numeric
  const typePattern =
    /^(varchar|text|integer|real|blob|datetime|numeric)(\(\d+\))?/i;
  if (!typePattern.test(trimmed)) {
    return false;
  }

  // Remove the type part to check constraints
  const withoutType = trimmed.replace(typePattern, "").trim();

  if (withoutType === "") {
    return true; // Type only, no constraints
  }

  // Allow specific constraint keywords in any order
  // Validate DEFAULT values more strictly - only allow safe literals
  // Split by spaces but keep quoted strings together
  const constraints: string[] = [];
  let currentToken = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < withoutType.length; i++) {
    const char = withoutType[i];

    if ((char === "'" || char === '"') && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      currentToken += char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      currentToken += char;
    } else if (char === " " && !inQuotes) {
      if (currentToken) {
        constraints.push(currentToken);
        currentToken = "";
      }
    } else {
      currentToken += char;
    }
  }
  if (currentToken) {
    constraints.push(currentToken);
  }

  const validKeywords = [
    "primary",
    "key",
    "not",
    "null",
    "unique",
    "default",
  ];
  // Allow: null, CURRENT_*, numbers, and quoted strings
  const validDefaultValues =
    /^(null|current_timestamp|current_date|current_time|-?\d+(\.\d+)?|'[^']*'|"[^"]*")$/i;

  let expectingDefaultValue = false;
  for (const constraint of constraints) {
    const lower = constraint.toLowerCase();

    if (expectingDefaultValue) {
      if (!validDefaultValues.test(constraint)) {
        return false; // Invalid default value
      }
      expectingDefaultValue = false;
    } else if (lower === "default") {
      expectingDefaultValue = true;
    } else if (!validKeywords.includes(lower)) {
      return false; // Invalid keyword
    }
  }

  // Ensure we're not left expecting a default value
  if (expectingDefaultValue) {
    return false; // Column definition ended with DEFAULT but no value
  }

  return true;
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

  // Note: String interpolation is safe here because tableName has been validated
  // against the isValidIdentifier regex, which only allows alphanumeric and underscores
  // PRAGMA statements don't support parameterized queries in SQLite
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
      // Note: String interpolation is safe here because all three parameters have been
      // validated against strict patterns:
      // - tableName: validated by isValidIdentifier (alphanumeric + underscores only)
      // - columnName: validated by isValidIdentifier (alphanumeric + underscores only)
      // - columnDefinition: validated by isValidColumnDefinition (safe types and constraints only)
      // SQLite's ALTER TABLE doesn't support parameterized queries for DDL statements
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
