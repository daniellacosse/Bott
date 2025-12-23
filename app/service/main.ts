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

import { APP_USER } from "@bott/constants";
import {
  type BottActionErrorEvent,
  type BottActionOutputEvent,
  BottEventType,
  BottEvent,
} from "@bott/events";
import type {
  BottService,
  BottServiceSettings,
} from "@bott/services";

import { createService } from "@bott/services";

import { actions } from "./actions.ts";

const RESPONSE_ACTION_NAME = actions.response.name;

const settings: BottServiceSettings = {
  name: APP_USER.name,
  events: new Set([
    BottEventType.MESSAGE,
    BottEventType.REPLY,
    BottEventType.REACTION,
    BottEventType.ACTION_CALL,
    BottEventType.ACTION_ABORT,
    BottEventType.ACTION_OUTPUT,
    BottEventType.ACTION_COMPLETE,
    BottEventType.ACTION_ERROR,
  ]),
  actions,
}

// Maps each channel ID to the ID of the in-flight response action
const channelActionIndex = new Map<string, string>();

export const appService: BottService = createService(
  function () {
    const callResponseAction = (event: BottEvent) => {
      if (!event.channel) return;

      const actionId = channelActionIndex.get(event.channel.id);

      if (actionId) {
        this.dispatchEvent(
          new BottEvent(
            BottEventType.ACTION_ABORT,
            {
              detail: {
                id: actionId,
              },
              user: APP_USER,
              channel: event.channel,
            },
          ),
        );
      }

      const id = crypto.randomUUID();

      channelActionIndex.set(event.channel.id, id);

      this.dispatchEvent(
        new BottEvent(
          BottEventType.ACTION_CALL,
          {
            detail: {
              id,
              name: RESPONSE_ACTION_NAME,
            },
            user: APP_USER,
            channel: event.channel,
          },
        ),
      );
    };

    const respondIfNotSelf = (event: BottEvent) => {
      if (!event.user || event.user.id === APP_USER.id) return;

      // Don't respond to errors/aborts from response actions to prevent loops
      if (
        event.type === BottEventType.ACTION_ERROR &&
        event.parent?.detail?.name === RESPONSE_ACTION_NAME
      ) return;

      callResponseAction(event);
    };


    this.addEventListener(BottEventType.MESSAGE, respondIfNotSelf);
    this.addEventListener(BottEventType.REPLY, respondIfNotSelf);
    this.addEventListener(BottEventType.REACTION, respondIfNotSelf);

    this.addEventListener(
      BottEventType.ACTION_OUTPUT,
      (output: BottActionOutputEvent) => {
        const { event, shouldInterpretOutput, shouldForwardOutput } =
          output.detail;

        if (shouldInterpretOutput) {
          callResponseAction(event);
        }

        if (shouldForwardOutput) {
          this.dispatchEvent(event);
        }
      },
    );

    const cleanupChannelActionIndex = (event: BottEvent) => {
      if (!event.channel) return;

      const actionId = channelActionIndex.get(event.channel.id);

      if (actionId === event.detail.id) {
        channelActionIndex.delete(event.channel.id);
      }
    };

    this.addEventListener(
      BottEventType.ACTION_COMPLETE,
      cleanupChannelActionIndex,
    );

    this.addEventListener(
      BottEventType.ACTION_ERROR,
      (event: BottActionErrorEvent) => {
        respondIfNotSelf(event);
        cleanupChannelActionIndex(event);
      },
    );
  },
  settings,
);

