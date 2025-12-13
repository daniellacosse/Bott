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

import { assertEquals, assertExists } from "@std/assert";
import { DatabaseSync } from "node:sqlite";
import { addColumnIfNotExists } from "./migrations.ts";

Deno.test("Migrations - addColumnIfNotExists adds new column", () => {
  const db = new DatabaseSync(":memory:");

  // Create a test table
  db.exec(`
    create table test_table (
      id varchar(36) primary key not null,
      name text not null
    );
  `);

  // Add a new column
  addColumnIfNotExists(db, "test_table", "description", "text");

  // Verify column was added
  const stmt = db.prepare("PRAGMA table_info(test_table)");
  const columns = stmt.all() as Array<{ name: string }>;
  const descriptionColumn = columns.find((col) => col.name === "description");

  assertExists(descriptionColumn, "Description column should exist");
});

Deno.test("Migrations - addColumnIfNotExists handles existing column", () => {
  const db = new DatabaseSync(":memory:");

  // Create a test table with a column
  db.exec(`
    create table test_table (
      id varchar(36) primary key not null,
      name text not null,
      description text
    );
  `);

  // Try to add the same column again (should not error)
  addColumnIfNotExists(db, "test_table", "description", "text");

  // Verify column still exists (only once)
  const stmt = db.prepare("PRAGMA table_info(test_table)");
  const columns = stmt.all() as Array<{ name: string }>;
  const descriptionColumns = columns.filter((col) =>
    col.name === "description"
  );

  assertEquals(
    descriptionColumns.length,
    1,
    "Should only have one description column",
  );
});

Deno.test("Migrations - schema creates tables in correct order", () => {
  const db = new DatabaseSync(":memory:");

  const schema = Deno.readTextFileSync(
    new URL("./schema.sql", import.meta.url).pathname,
  );

  // Execute schema - should not throw errors
  db.exec(schema);

  // Verify all tables were created
  const stmt = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name;
  `);
  const tables = stmt.all() as Array<{ name: string }>;
  const tableNames = tables.map((t) => t.name);

  // Check that all expected tables exist
  assertEquals(
    tableNames.includes("spaces"),
    true,
    "spaces table should exist",
  );
  assertEquals(
    tableNames.includes("channels"),
    true,
    "channels table should exist",
  );
  assertEquals(tableNames.includes("users"), true, "users table should exist");
  assertEquals(
    tableNames.includes("events"),
    true,
    "events table should exist",
  );
  assertEquals(tableNames.includes("files"), true, "files table should exist");
  assertEquals(
    tableNames.includes("attachments"),
    true,
    "attachments table should exist",
  );
});

Deno.test("Migrations - schema is idempotent", () => {
  const db = new DatabaseSync(":memory:");

  const schema = Deno.readTextFileSync(
    new URL("./schema.sql", import.meta.url).pathname,
  );

  // Execute schema twice - should not throw errors
  db.exec(schema);
  db.exec(schema);

  // Verify tables still exist
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM sqlite_master 
    WHERE type='table' AND name IN ('spaces', 'channels', 'users', 'events', 'files', 'attachments');
  `);
  const result = stmt.get() as { count: number };

  assertEquals(result.count, 6, "All 6 tables should exist");
});
