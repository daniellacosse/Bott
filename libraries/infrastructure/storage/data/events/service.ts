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

import { log } from "@bott/log";
import {
  type BottEvent,
  BottEventType,
  type BottService,
  type BottServiceFactory,
} from "@bott/model";
import { addEventListener } from "@bott/service";

import { addEvents } from "./add.ts";

export const startEventStorageService: BottServiceFactory = (): Promise<
  BottService
> => {
  const saveEvent = (event: BottEvent) => {
    const result = addEvents(event);

    if ("error" in result) {
      log.error("Failed to add event to database:", result);
    } else {
      log.info("Event added to database:", result);
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
    BottEventType.ACTION_START,
    saveEvent,
  );
  addEventListener(
    BottEventType.ACTION_COMPLETE,
    saveEvent,
  );
  addEventListener(
    BottEventType.ACTION_ERROR,
    saveEvent,
  );
  addEventListener(
    BottEventType.ACTION_ABORT,
    saveEvent,
  );

  return Promise.resolve({ user: { id: "system:storage", name: "Storage" } });
};
