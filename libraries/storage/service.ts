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

import {
  type BottEvent,
  BottEventType,
  type BottService,
  type BottServiceFactory,
} from "@bott/model";
import { log } from "@bott/logger";
import { addEventListener } from "@bott/service";
import { addEvents } from "./data/events/add.ts";

const dbClientSchema = Deno.readTextFileSync(
  new URL("./data/schema.sql", import.meta.url).pathname,
);

export let STORAGE_ROOT: string;
export let STORAGE_FILE_ROOT: string;
export let STORAGE_FILE_SIZE_CAUTION: number;
export let STORAGE_DATA_CLIENT: DatabaseSync;

export const startStorageService: BottServiceFactory = (
  {
    root = "",
    assetSizeCautionBytes = 100_000,
  }: { root?: string; assetSizeCautionBytes?: number },
): Promise<BottService> => {
  const _createStorage = () => {
    if (!STORAGE_ROOT) {
      const fileRoot = join(root, "files");

      Deno.mkdirSync(fileRoot, { recursive: true });

      STORAGE_ROOT = root;
      STORAGE_FILE_ROOT = fileRoot;
      STORAGE_FILE_SIZE_CAUTION = assetSizeCautionBytes;
    }

    if (!STORAGE_DATA_CLIENT) {
      STORAGE_DATA_CLIENT = new DatabaseSync(
        join(STORAGE_ROOT, "data.db"),
      );

      STORAGE_DATA_CLIENT.exec(dbClientSchema);
    }
  };

  _createStorage();

  const saveEvent = (event: BottEvent) => {
    _createStorage();

    const result = addEvents(event);

    if ("error" in result) {
      log.error("Failed to add event to database:", result);
    }
  };

  addEventListener(BottEventType.MESSAGE, saveEvent);
  addEventListener(BottEventType.REPLY, saveEvent);
  addEventListener(BottEventType.REACTION, saveEvent);
  addEventListener(
    BottEventType.ACTION_CALL,
    saveEvent,
  );
  addEventListener(
    BottEventType.ACTION_RESULT,
    saveEvent,
  );

  return Promise.resolve({ user: { id: "system:storage", name: "Storage" } });
};
