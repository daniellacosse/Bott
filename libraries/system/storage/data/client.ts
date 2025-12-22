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

import { DatabaseSync } from "node:sqlite";
import { STORAGE_DATA_LOCATION, STORAGE_FILE_ROOT } from "@bott/constants";

export const schema: string = Deno.readTextFileSync(
  new URL("./schema.sql", import.meta.url).pathname,
);

Deno.mkdirSync(STORAGE_FILE_ROOT, { recursive: true });

export const client = new DatabaseSync(
  STORAGE_DATA_LOCATION,
);

client.exec(schema);
