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

import { log } from "@bott/common";
import { createService } from "../../services/create.ts";
import { type BottEventInterface as BottEvent, BottEventType } from "../../types.ts";
import type {
  BottService,
} from "../../types.ts";

import { upsertEvents } from "./upsert.ts";

export const eventStorageService: BottService = createService({
  name: "eventStorage",
},
  function () {
    const saveEvent = (event: BottEvent) => {
      const result = upsertEvents(event);

      if (event.type === BottEventType.ACTION_ERROR) {
        log.error("Action error received:", event.detail.error);
      }

      // Not important enough for the system to know about.
      if ("error" in result) {
        log.error("Failed to store event:", event, result.error);
      } else {
        log.info("Event stored:", event);
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
      BottEventType.ACTION_OUTPUT,
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
);
