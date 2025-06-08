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

import { join } from "jsr:@std/path";
import { DatabaseSync } from "node:sqlite";

const dbClientSchema = Deno.readTextFileSync(
  new URL("./data/schema.sql", import.meta.url).pathname,
);

export let STORAGE_ROOT: string;
export let STORAGE_FILE_INPUT_ROOT: string;
export let STORAGE_FILE_OUTPUT_ROOT: string;
export let STORAGE_FILE_SIZE_CAUTION: number;
export let STORAGE_DATA_CLIENT: DatabaseSync;

export const startStorage = (
  root: string,
  { assetSizeCautionBytes = 100_000 } = {},
) => {
  // Create asset cache folder:
  const fileInputRoot = join(root, "files/input");
  const fileOutputRoot = join(root, "files/output");

  Deno.mkdirSync(fileInputRoot, { recursive: true });
  Deno.mkdirSync(fileOutputRoot, { recursive: true });

  STORAGE_ROOT = root;
  STORAGE_FILE_INPUT_ROOT = fileInputRoot;
  STORAGE_FILE_OUTPUT_ROOT = fileOutputRoot;
  STORAGE_FILE_SIZE_CAUTION = assetSizeCautionBytes;

  // Create database file:
  STORAGE_DATA_CLIENT = new DatabaseSync(
    join(root, "data.db"),
  );

  // Initialize database tables:
  STORAGE_DATA_CLIENT.exec(dbClientSchema);
};
