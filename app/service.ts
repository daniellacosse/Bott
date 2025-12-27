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
  ACTION_RESPONSE_DEBOUNCE_MS,
  ACTION_RESPONSE_NAME,
  APP_USER,
} from "@bott/common";
import System, {
  type BottActionCallEvent,
  type BottActionErrorEvent,
  type BottActionOutputEvent,
  type BottEventInterface as BottEvent,
  BottEventType,
  type BottService,
} from "@bott/system";

import { debounce } from "@std/async";

// Maps each channel ID to its response state
type ChannelResponseState = {
  currentResponse?: BottActionCallEvent;
  debouncedResponse?: (event: BottEvent) => void;
};

const channelResponseStateIndex = new Map<string, ChannelResponseState>();

export const appService: BottService = System.Services.create({
  name: APP_USER.name,
  user: APP_USER,
}, function () {
  const callResponseAction = (event: BottEvent) => {
    if (!event.channel) return;

    const { currentResponse, debouncedResponse } =
      channelResponseStateIndex.get(event.channel.id) ?? {};

    if (currentResponse) {
      this.dispatchEvent(
        System.Events.create(
          BottEventType.ACTION_ABORT,
          {
            detail: {
              id: currentResponse.id,
            },
            user: APP_USER,
            channel: event.channel,
            parent: currentResponse,
          },
        ),
      );
    }

    const responseCall = System.Events.create(
      BottEventType.ACTION_CALL,
      {
        detail: {
          name: ACTION_RESPONSE_NAME,
        },
        user: APP_USER,
        channel: event.channel,
      },
    ) as BottActionCallEvent;

    channelResponseStateIndex.set(event.channel.id, {
      debouncedResponse,
      currentResponse: responseCall,
    });

    this.dispatchEvent(responseCall);
  };

  const debouncedCallResponseAction = (event: BottEvent) => {
    if (!event.channel) return;

    let { debouncedResponse, currentResponse } =
      channelResponseStateIndex.get(event.channel.id) ?? {};

    if (debouncedResponse) {
      return debouncedResponse(event);
    }

    debouncedResponse = debounce(
      callResponseAction,
      ACTION_RESPONSE_DEBOUNCE_MS,
    );

    channelResponseStateIndex.set(event.channel.id, {
      debouncedResponse,
      currentResponse,
    });
    debouncedResponse(event);
  };

  const respondIfNotSelf = (event: BottEvent) => {
    if (
      !ACTION_RESPONSE_NAME || !event.user || event.user.id === APP_USER.id
    ) return;

    // Don't respond to errors/aborts from response actions to prevent loops
    if (
      event.type === BottEventType.ACTION_ERROR &&
      event.parent?.detail?.name === ACTION_RESPONSE_NAME
    ) return;

    debouncedCallResponseAction(event);
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
        debouncedCallResponseAction(event);
      }

      if (shouldForwardOutput) {
        this.dispatchEvent(event);
      }
    },
  );

  const cleanupChannelResponseActionIndex = (event: BottEvent) => {
    if (!event.channel) return;

    const channelState = channelResponseStateIndex.get(event.channel.id);

    if (!channelState) return;

    if (channelState.currentResponse?.id === event.detail.id) {
      channelState.currentResponse = undefined;
    }
  };

  this.addEventListener(
    BottEventType.ACTION_COMPLETE,
    cleanupChannelResponseActionIndex,
  );

  this.addEventListener(
    BottEventType.ACTION_ERROR,
    (event: BottActionErrorEvent) => {
      respondIfNotSelf(event);
      cleanupChannelResponseActionIndex(event);
    },
  );
});
