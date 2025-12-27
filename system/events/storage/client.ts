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

import {
  commit as _commit,
  type SqlInstructions,
  STORAGE_DATA_LOCATION,
  STORAGE_FILE_ROOT,
} from "@bott/common";

export const modelSchema: string = Deno.readTextFileSync(
  new URL("../../../model/schema.sql", import.meta.url).pathname,
);
export const eventSchema: string = Deno.readTextFileSync(
  new URL("./schema.sql", import.meta.url).pathname,
);

Deno.mkdirSync(STORAGE_FILE_ROOT, { recursive: true });

const client = new DatabaseSync(
  STORAGE_DATA_LOCATION,
);

client.exec(modelSchema);
client.exec(eventSchema);

export const commit = (...instructions: SqlInstructions[]) => {
  return _commit(client, ...instructions);
};
