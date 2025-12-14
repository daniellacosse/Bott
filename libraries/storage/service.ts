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
  BottEvent,
  BottEventType,
  BottService,
  BottServiceFactory,
} from "@bott/model";
import { log } from "@bott/logger";
import { STORAGE_DEPLOY_NONCE_PATH } from "@bott/constants";
import { addEvents } from "./data/events/add.ts";

const dbClientSchema = Deno.readTextFileSync(
  new URL("./data/schema.sql", import.meta.url).pathname,
);

export let STORAGE_ROOT: string;
export let STORAGE_FILE_ROOT: string;
export let STORAGE_FILE_SIZE_CAUTION: number;
export let STORAGE_DATA_CLIENT: DatabaseSync;

const _getCurrentDeployNonce = () => {
  try {
    return Deno.readTextFileSync(STORAGE_DEPLOY_NONCE_PATH);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }
    throw error;
  }
};

type StorageServiceOptions = {
  root: string;
  assetSizeCautionBytes?: number;
};

export const startStorageService: BottServiceFactory<StorageServiceOptions> = (
  {
    root,
    assetSizeCautionBytes = 100_000,
    deployNonce,
    events,
  },
): Promise<BottService> => {
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
  STORAGE_DATA_CLIENT.exec(dbClientSchema);

  const storageUser = { id: "system:storage", name: "Storage" };

  // Listen for all events to persist them
  const handleEventPersistence = (event: Event) => {
    const bottEvent = event as BottEvent;

    // Standard gate: Deploy Nonce
    if (deployNonce && _getCurrentDeployNonce() !== deployNonce) {
      return;
    }

    // Persist
    const result = addEvents(bottEvent);
    if ("error" in result) {
      log.error("Failed to add event to database:", result);
    }

    // Call specific handler if provided
    if (
      events && Object.prototype.hasOwnProperty.call(events, bottEvent.type)
    ) {
      events[bottEvent.type as keyof typeof events]!(bottEvent);
    }
  };

  globalThis.addEventListener(BottEventType.MESSAGE, handleEventPersistence);
  globalThis.addEventListener(BottEventType.REPLY, handleEventPersistence);
  globalThis.addEventListener(BottEventType.REACTION, handleEventPersistence);
  globalThis.addEventListener(
    BottEventType.ACTION_CALL,
    handleEventPersistence,
  );
  globalThis.addEventListener(
    BottEventType.ACTION_RESULT,
    handleEventPersistence,
  );

  return Promise.resolve({ user: storageUser });
};
