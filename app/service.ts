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
  type AnyShape,
  type BottAction,
  BottActionCallEvent,
  BottActionResultEvent,
  BottEvent,
  BottEventType,
  BottServiceFactory,
  type BottUser,
} from "@bott/model";
import { getEventIdsForChannel, getEvents } from "@bott/storage";
import { createTask } from "@bott/task";
import { generateErrorMessage, generateEvents } from "@bott/gemini";
import { log } from "@bott/logger";
import { STORAGE_DEPLOY_NONCE_PATH } from "@bott/constants";
import { taskManager } from "./tasks.ts";
import { getDefaultGlobalSettings } from "./defaultGlobalSettings/main.ts";
import * as actions from "./actions/main.ts";
import {
  generateMedia,
  GenerateMediaOptions,
} from "./actions/generateMedia.ts";

const WORDS_PER_MINUTE = 200;
const MS_IN_MINUTE = 60 * 1000;
const MAX_TYPING_TIME_MS = 3000;
const DEFAULT_RESPONSE_SWAPS = 6;

type MainServiceOptions = {
  botUser: BottUser;
};

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

export const startMainService: BottServiceFactory<MainServiceOptions> = (
  {
    botUser,
    deployNonce,
    events,
  },
) => {
  const handleConversationTasks = (event: Event) => {
    if (deployNonce && _getCurrentDeployNonce() !== deployNonce) return;

    const bottEvent = event as BottEvent;

    // Call specific handler if mapped
    if (
      events && Object.prototype.hasOwnProperty.call(events, bottEvent.type)
    ) {
      events[bottEvent.type as keyof typeof events]!(bottEvent);
    }

    // Only trigger generation for incoming messages from others
    if (!bottEvent.channel) return;
    if (!bottEvent.user) return; // Should have user

    if (bottEvent.user.id === botUser.id) return; // Ignore self

    if (
      bottEvent.type === BottEventType.MESSAGE ||
      bottEvent.type === BottEventType.REPLY
    ) {
      // Trigger conversation Task
      if (!taskManager.has(bottEvent.channel.name)) {
        taskManager.add({
          name: bottEvent.channel.name,
          remainingSwaps: DEFAULT_RESPONSE_SWAPS,
          completions: [],
          config: {
            maximumSequentialSwaps: DEFAULT_RESPONSE_SWAPS,
          },
        });
      }

      taskManager.push(
        bottEvent.channel.name,
        createTask(async (abortSignal: AbortSignal) => {
          let eventHistoryResult;
          try {
            const eventHistoryIds = getEventIdsForChannel(
              bottEvent.channel!.id,
            );
            eventHistoryResult = await getEvents(...eventHistoryIds);
          } catch (error) {
            throw new Error("Failed to get channel history.", {
              cause: error,
            });
          }

          if (abortSignal.aborted) {
            throw new Error("Aborted task: before getting event generator");
          }

          const thisChannel = bottEvent.channel!;
          const settings = getDefaultGlobalSettings({ user: botUser });

          const context = {
            user: botUser,
            channel: thisChannel,
            actions: actions as unknown as Record<string, BottAction>,
            settings,
          };

          const eventGenerator = generateEvents(
            eventHistoryResult,
            { ...context, abortSignal },
          );

          for await (const genEvent of eventGenerator) {
            if (abortSignal.aborted) {
              throw new Error("Aborted task: before typing message");
            }

            // Dispatch event (triggers listeners)
            globalThis.dispatchEvent(genEvent);

            if (
              genEvent.type === BottEventType.MESSAGE ||
              genEvent.type === BottEventType.REPLY
            ) {
              // Typing simulation logic
              const words =
                (genEvent.detail.content as string).split(/\s+/).length;
              const delayMs = (words / WORDS_PER_MINUTE) * MS_IN_MINUTE;
              const cappedDelayMs = Math.min(delayMs, MAX_TYPING_TIME_MS);
              await delay(cappedDelayMs, { signal: abortSignal });
            }
          }
        }),
      );
    }
  };

  const handleActionExecution = async (event: Event) => {
    if (deployNonce && _getCurrentDeployNonce() !== deployNonce) return;

    const bottEvent = event as BottActionCallEvent;

    // Call specific handler
    if (
      events && Object.prototype.hasOwnProperty.call(events, bottEvent.type)
    ) {
      events[bottEvent.type as keyof typeof events]!(bottEvent);
    }

    // Only execute Action Calls
    if (bottEvent.type !== BottEventType.ACTION_CALL) return;

    let responsePromise;
    const actionName = (bottEvent as BottActionCallEvent<AnyShape>).detail.name;

    switch (actionName) {
      case "generateMedia":
      default:
        responsePromise = generateMedia(
          bottEvent as BottActionCallEvent<GenerateMediaOptions>,
        );
        break;
    }

    try {
      const responseEvent = await responsePromise;
      responseEvent.parent = bottEvent;
      // Dispatch result
      globalThis.dispatchEvent(responseEvent);
    } catch (error) {
      log.warn("Failed to generate media:", error);

      const context = {
        user: botUser,
        channel: bottEvent.channel!, // Assume channel exists on call
        actions: actions as unknown as Record<string, BottAction>,
        settings: getDefaultGlobalSettings({ user: botUser }),
      };

      const errorEvent = await generateErrorMessage(
        error,
        bottEvent as BottActionCallEvent<AnyShape>,
        context,
      );
      globalThis.dispatchEvent(errorEvent);
    }
  };

  const handleActionResultConversion = (event: Event) => {
    if (deployNonce && _getCurrentDeployNonce() !== deployNonce) return;

    const bottEvent = event as BottActionResultEvent;

    // Call specific handler
    if (
      events && Object.prototype.hasOwnProperty.call(events, bottEvent.type)
    ) {
      events[bottEvent.type as keyof typeof events]!(bottEvent);
    }

    if (bottEvent.type !== BottEventType.ACTION_RESULT) return;

    // Check if parent call was from Us (Bot)
    if (!bottEvent.parent) return;

    if (bottEvent.parent.user?.id === botUser.id) {
      // Convert to Message/Reply
      const replyEvent = new BottEvent(
        bottEvent.parent.parent ? BottEventType.REPLY : BottEventType.MESSAGE,
        {
          detail: {
            content: bottEvent.detail.content || "", // Extract content
          },
          attachments: bottEvent.attachments,
          user: botUser,
          channel: bottEvent.channel,
          parent: bottEvent.parent,
        },
      );

      replyEvent.parent = bottEvent.parent.parent;

      // Dispatch the message
      globalThis.dispatchEvent(replyEvent);
    }
  };

  // Register Listeners
  globalThis.addEventListener(BottEventType.MESSAGE, handleConversationTasks);
  globalThis.addEventListener(BottEventType.REPLY, handleConversationTasks);
  globalThis.addEventListener(BottEventType.REACTION, handleConversationTasks);
  globalThis.addEventListener(BottEventType.ACTION_CALL, handleActionExecution);
  globalThis.addEventListener(
    BottEventType.ACTION_RESULT,
    handleActionResultConversion,
  );

  return Promise.resolve({ user: botUser });
};
