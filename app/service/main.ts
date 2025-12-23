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

import { ACTION_RESPONSE_DEBOUNCE_MS, APP_USER } from "@bott/constants";
import {
  type BottActionCallEvent,
  type BottActionErrorEvent,
  type BottActionOutputEvent,
  BottEvent,
  BottEventType,
} from "@bott/events";
import type { BottService, BottServiceSettings } from "@bott/services";
import { createService } from "@bott/services";

import { debounce } from "@std/async";

import { actions } from "./actions.ts";

const RESPONSE_ACTION_NAME = actions.response?.name;

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
};

// Maps each channel ID to its state
type ChannelResponseState = {
  currentResponse?: BottActionCallEvent;
  debouncedCaller?: (event: BottEvent) => void;
};

const channelResponseStateIndex = new Map<string, ChannelResponseState>();

export const appService: BottService = createService(
  function () {
    const callResponseAction = (event: BottEvent) => {
      if (!event.channel) return;

      const { currentResponse, debouncedCaller } =
        channelResponseStateIndex.get(event.channel.id) ?? {};

      if (currentResponse) {
        this.dispatchEvent(
          new BottEvent(
            BottEventType.ACTION_ABORT,
            {
              detail: {
                id: currentResponse.detail.id,
              },
              user: APP_USER,
              channel: event.channel,
              parent: currentResponse,
            },
          ),
        );
      }

      const responseCall = new BottEvent(
        BottEventType.ACTION_CALL,
        {
          detail: {
            name: RESPONSE_ACTION_NAME,
          },
          user: APP_USER,
          channel: event.channel,
        },
      ) as BottActionCallEvent;

      channelResponseStateIndex.set(event.channel.id, {
        debouncedCaller,
        currentResponse: responseCall,
      });

      this.dispatchEvent(responseCall);
    };

    const debouncedCallResponseAction = (event: BottEvent) => {
      if (!event.channel) return;

      let { debouncedCaller, currentResponse } =
        channelResponseStateIndex.get(event.channel.id) ?? {};

      if (debouncedCaller) {
        return debouncedCaller(event);
      }

      debouncedCaller = debounce(
        callResponseAction,
        ACTION_RESPONSE_DEBOUNCE_MS,
      );

      channelResponseStateIndex.set(event.channel.id, {
        debouncedCaller,
        currentResponse,
      });
      debouncedCaller(event);
    };

    const respondIfNotSelf = (event: BottEvent) => {
      if (
        !RESPONSE_ACTION_NAME || !event.user || event.user.id === APP_USER.id
      ) return;

      // Don't respond to errors/aborts from response actions to prevent loops
      if (
        event.type === BottEventType.ACTION_ERROR &&
        event.parent?.detail?.name === RESPONSE_ACTION_NAME
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

      if (channelState.currentResponse?.detail.id === event.detail.id) {
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
  },
  settings,
);
