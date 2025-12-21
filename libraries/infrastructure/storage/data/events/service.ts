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

import { BottActionEventType } from "@bott/actions";
import { log } from "@bott/log";
import { BottEvent, BottEventType } from "@bott/model";
import { type BottService, type BottServiceSettings, createService } from "@bott/services";

import { addEvents } from "./add.ts";

const settings: BottServiceSettings = {
  name: "eventStorage",
  events: new Set([
    BottEventType.MESSAGE,
    BottEventType.REPLY,
    BottEventType.REACTION,
    BottActionEventType.ACTION_CALL,
    BottActionEventType.ACTION_START,
    BottActionEventType.ACTION_COMPLETE,
    BottActionEventType.ACTION_ERROR,
    BottActionEventType.ACTION_ABORT,
  ]),
};

export const eventStorageService: BottService = createService(
  function () {
    const saveEvent = (event: BottEvent) => {
      const result = addEvents(event);

      if ("error" in result) {
        log.error("Failed to add event to database:", result);
      } else {
        log.info("Event added to database:", result);
      }
    };

    this.addEventListener(BottEventType.MESSAGE, saveEvent);
    this.addEventListener(BottEventType.REPLY, saveEvent);
    this.addEventListener(BottEventType.REACTION, saveEvent);
    this.addEventListener(
      BottActionEventType.ACTION_CALL,
      saveEvent,
    );
    this.addEventListener(
      BottActionEventType.ACTION_START,
      saveEvent,
    );
    this.addEventListener(
      BottActionEventType.ACTION_COMPLETE,
      saveEvent,
    );
    this.addEventListener(
      BottActionEventType.ACTION_ERROR,
      saveEvent,
    );
    this.addEventListener(
      BottActionEventType.ACTION_ABORT,
      saveEvent,
    );
  },
  settings,
);
