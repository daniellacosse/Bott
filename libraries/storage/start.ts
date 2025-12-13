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

import { join } from "@std/path";
import { DatabaseSync } from "node:sqlite";
import { applyMigrations } from "./data/migrations.ts";

const dbClientSchema = Deno.readTextFileSync(
  new URL("./data/schema.sql", import.meta.url).pathname,
);

export let STORAGE_ROOT: string;
export let STORAGE_FILE_ROOT: string;
export let STORAGE_FILE_SIZE_CAUTION: number;
export let STORAGE_DATA_CLIENT: DatabaseSync;

export const startStorage = (
  root: string,
  { assetSizeCautionBytes = 100_000 } = {},
): void => {
  // Create asset cache folder:
  const fileRoot = join(root, "files");

  Deno.mkdirSync(fileRoot, { recursive: true });

  STORAGE_ROOT = root;
  STORAGE_FILE_ROOT = fileRoot;
  STORAGE_FILE_SIZE_CAUTION = assetSizeCautionBytes;

  // Create database file:
  STORAGE_DATA_CLIENT = new DatabaseSync(
    join(root, "data.db"),
  );

  // Initialize database tables:
  // Tables are created in dependency order to minimize errors
  STORAGE_DATA_CLIENT.exec(dbClientSchema);

  // Apply any schema migrations for existing databases:
  // This ensures older schemas are updated and new columns are added safely
  applyMigrations(STORAGE_DATA_CLIENT);
};
