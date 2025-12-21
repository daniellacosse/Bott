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

import {
  type BottActionErrorEvent,
  BottActionEventType,
  type BottActionOutputEvent,
} from "@bott/actions";
import { APP_NAME } from "@bott/constants";
import { BottEventType, type BottUser } from "@bott/model";
import {
  type BottService,
  type BottServiceSettings,
} from "@bott/services";

import { createService } from "@bott/services";

import { actions } from "./actions.ts";

const RESPONSE_ACTION_NAME = "response";

// Maps each channel ID to the ID of the in-flight response action
const channelActionIndex = new Map<string, string>();

const settings: BottServiceSettings = {
  name: APP_NAME,
  events: new Set([
    BottEventType.MESSAGE,
    BottEventType.REPLY,
    BottEventType.REACTION,
    BottActionEventType.ACTION_OUTPUT,
    BottActionEventType.ACTION_COMPLETE,
    BottActionEventType.ACTION_ERROR,
  ]),
  actions,
}

export const appService: BottService = createService(
  function () {
    this.addEventListener(BottEventType.MESSAGE, respondIfNotSelf);
    this.addEventListener(BottEventType.REPLY, respondIfNotSelf);
    this.addEventListener(BottEventType.REACTION, respondIfNotSelf);

    this.addEventListener(
      BottActionEventType.ACTION_OUTPUT,
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

    this.addEventListener(
      BottActionEventType.ACTION_COMPLETE,
      cleanupChannelActionIndex,
    );

    this.addEventListener(
      BottActionEventType.ACTION_ERROR,
      (event: BottActionErrorEvent) => {
        respondIfNotSelf(event);
        cleanupChannelActionIndex(event);
      },
    );
  },
  settings,
);

const appUser: BottUser = {
  id: APP_NAME,
  name: APP_NAME,
};

function callResponseAction(event: BottEvent) {
  if (!event.channel) return;

  const actionId = channelActionIndex.get(event.channel.id);

  if (actionId) {
    this.dispatchEvent(
      new BottEvent(
        BottActionEventType.ACTION_ABORT,
        {
          detail: {
            id: actionId,
            name: RESPONSE_ACTION_NAME,
          },
          user: appUser,
          channel: event.channel,
        },
      ),
    );
  }

  const id = crypto.randomUUID();

  channelActionIndex.set(event.channel.id, id);

  this.dispatchEvent(
    new BottEvent(
      BottActionEventType.ACTION_CALL,
      {
        detail: {
          id,
          name: RESPONSE_ACTION_NAME,
        },
        user: appUser,
        channel: event.channel,
      },
    ),
  );
};

function respondIfNotSelf(event: BottEvent) {
  if (!event.user || event.user.id === APP_NAME) return;

  // Don't respond to errors/aborts from responses to prevent loops
  if (
    event.type === BottActionEventType.ACTION_ERROR &&
    event.detail.name === RESPONSE_ACTION_NAME
  ) return;

  callResponseAction(event);
};

function cleanupChannelActionIndex(event: BottEvent) {
  if (!event.channel) return;

  const actionId = channelActionIndex.get(event.channel.id);

  if (actionId === event.detail.id) {
    channelActionIndex.delete(event.channel.id);
  }
};
