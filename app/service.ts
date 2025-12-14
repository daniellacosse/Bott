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

import { delay } from "@std/async";

import {
  type BottAction,
  type BottActionCallEvent,
  type BottActionResultEvent,
  BottEventType,
  type BottService,
  type BottServiceFactory,
} from "@bott/model";
import { addEventListener, BottEvent } from "@bott/service";
import { getEventIdsForChannel, getEvents } from "@bott/storage";
import { createTask } from "@bott/task";
import { generateEvents } from "@bott/gemini";

import { BOTT_USER } from "@bott/constants";
import { taskManager } from "./tasks.ts";
import { defaultSettings } from "./settings/main.ts";
import {
  generateMedia,
  GenerateMediaOptions,
} from "./actions/generateMedia.ts";

const WORDS_PER_MINUTE = 200;
const MS_IN_MINUTE = 60 * 1000;
const MAX_TYPING_TIME_MS = 3000;
const DEFAULT_RESPONSE_SWAPS = 6;

const mainService: BottService = {
  user: BOTT_USER,
};

export const startMainService: BottServiceFactory = ({
  actions = {},
}: { actions?: Record<string, BottAction> }) => {
  const evaluateAndRespond = (event: BottEvent, service?: BottService) => {
    if (!event.channel) return;
    if (!event.user) return;
    if (service) return;

    if (!taskManager.has(event.channel.name)) {
      taskManager.add({
        name: event.channel.name,
        remainingSwaps: DEFAULT_RESPONSE_SWAPS,
        completions: [],
        config: {
          maximumSequentialSwaps: DEFAULT_RESPONSE_SWAPS,
        },
      });
    }

    taskManager.push(
      event.channel.name,
      createTask(async (abortSignal: AbortSignal) => {
        const eventHistoryIds = getEventIdsForChannel(
          event.channel!.id,
        );
        const channelHistory = await getEvents(...eventHistoryIds);
        const channelContext = {
          user: mainService.user,
          channel: event.channel!,
          actions,
          settings: defaultSettings,
          abortSignal,
        };

        for await (
          const generatedEvent of generateEvents(
            channelHistory,
            channelContext,
          )
        ) {
          if (abortSignal.aborted) {
            throw new Error("Aborted task: before typing message");
          }

          // Typing simulation logic
          const words =
            (generatedEvent.detail.content as string).split(/\s+/).length;
          const delayMs = (words / WORDS_PER_MINUTE) * MS_IN_MINUTE;
          const cappedDelayMs = Math.min(delayMs, MAX_TYPING_TIME_MS);
          await delay(cappedDelayMs, { signal: abortSignal });

          if (abortSignal.aborted) {
            throw new Error("Aborted task: before dispatching event");
          }

          globalThis.dispatchEvent(generatedEvent);
        }
      }),
    );
  };

  addEventListener(BottEventType.MESSAGE, evaluateAndRespond);
  addEventListener(BottEventType.REPLY, evaluateAndRespond);
  addEventListener(BottEventType.REACTION, evaluateAndRespond);

  // Handle action calls
  addEventListener(BottEventType.ACTION_CALL, async (
    event: BottActionCallEvent,
    service?: BottService,
  ) => {
    if (!service) {
      throw new Error("Action called without service");
    }

    let responsePromise;

    switch (event.detail.name) {
      case "generateMedia":
      default:
        responsePromise = generateMedia(
          event as BottActionCallEvent<GenerateMediaOptions>,
        );
        break;
    }

    const responseEvent = await responsePromise;
    responseEvent.parent = event;

    globalThis.dispatchEvent(responseEvent);
  });

  // Forward action results back to the original channel
  addEventListener(BottEventType.ACTION_RESULT, (
    event: BottActionResultEvent,
    service?: BottService,
  ) => {
    if (!service) return;

    const replyEvent = new BottEvent(
      event.parent?.parent ? BottEventType.REPLY : BottEventType.MESSAGE,
      {
        detail: event.detail,
        attachments: event.attachments,
        user: service.user,
        channel: event.channel,
        parent: event.parent?.parent,
      },
    );

    globalThis.dispatchEvent(replyEvent);
  });

  return Promise.resolve(mainService);
};
