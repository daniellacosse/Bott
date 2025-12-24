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

import { type BottEvent, BottEventType } from "@bott/events";
import { log } from "@bott/log";
import {
  type BottService,
  type BottServiceSettings,
  createService,
} from "@bott/services";

import { upsertEvents } from "./upsert.ts";

const settings: BottServiceSettings = {
  name: "eventStorage",
};

export const eventStorageService: BottService = createService(
  function () {
    const saveEvent = (event: BottEvent) => {
      const result = upsertEvents(event);

      if (event.type === BottEventType.ACTION_ERROR) {
        log.error(
          "Action error received:",
          event.id,
          event.detail.error,
        );
      }

      // Not important enough for the system to know about.
      if ("error" in result) {
        log.error(
          "Failed to store event:",
          event.id,
          event.type,
          result.error,
        );
      } else {
        log.info(
          "Event stored:",
          event.id,
          event.type,
        );
      }
    };

    this.addEventListener(BottEventType.MESSAGE, saveEvent);
    this.addEventListener(BottEventType.REPLY, saveEvent);
    this.addEventListener(BottEventType.REACTION, saveEvent);
    this.addEventListener(
      BottEventType.ACTION_CALL,
      saveEvent,
    );
    this.addEventListener(
      BottEventType.ACTION_START,
      saveEvent,
    );
    this.addEventListener(
      BottEventType.ACTION_COMPLETE,
      saveEvent,
    );
    this.addEventListener(
      BottEventType.ACTION_ERROR,
      saveEvent,
    );
    this.addEventListener(
      BottEventType.ACTION_ABORT,
      saveEvent,
    );
  },
  settings,
);
