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
  BottEventType,
} from "@bott/model";
import {
  addEvents,
  getEventIdsForChannel,
  getEvents,
  startStorage,
} from "@bott/storage";
import { createTask } from "@bott/task";
import { startDiscordBot } from "@bott/discord";
import { generateErrorMessage, generateEvents } from "@bott/gemini";
import { log } from "@bott/logger";
import { taskManager } from "./tasks.ts";

import * as actions from "./actions/main.ts";
import {
  generateMedia,
  GenerateMediaOptions,
} from "./actions/generateMedia.ts";
import {
  DISCORD_TOKEN,
  PORT,
  STORAGE_DEPLOY_NONCE_PATH,
  STORAGE_ROOT,
} from "@bott/constants";
import { getDefaultGlobalSettings } from "./defaultGlobalSettings/main.ts";

const WORDS_PER_MINUTE = 200;
const MS_IN_MINUTE = 60 * 1000;
const MAX_TYPING_TIME_MS = 3000;
const DEFAULT_RESPONSE_SWAPS = 6;

startStorage(STORAGE_ROOT);

// Set up deploy check:
const deployNonce = crypto.randomUUID();

Deno.writeTextFileSync(STORAGE_DEPLOY_NONCE_PATH, deployNonce);

startDiscordBot({
  // TODO(#63): Unify action infrastructure
  actions: { help: actions.help },
  identityToken: DISCORD_TOKEN!,
  mount() {
    log.info(
      `Running bot "${this.user.name}" at user id "<@${this.user.id}>"`,
    );
  },
  event(event) {
    if (deployNonce !== _getCurrentDeployNonce()) {
      log.debug("Deploy nonce mismatch, ignoring event.");
      return;
    }

    if (!event.channel) {
      // This shouldn't happen.
      return;
    }

    if (event.user?.id === this.user.id) {
      // Bott shouldn't respond to themselves,
      return;
    }

    const result = addEvents(event);

    if ("error" in result) {
      log.error("Failed to add event to database:", result);
      return;
    }

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
        let eventHistoryResult;

        try {
          const eventHistoryIds = getEventIdsForChannel(event.channel!.id);
          eventHistoryResult = await getEvents(...eventHistoryIds);
        } catch (error) {
          throw new Error("Failed to get channel history.", {
            cause: error,
          });
        }

        if (abortSignal.aborted) {
          throw new Error("Aborted task: before getting event generator");
        }

        const thisChannel = event.channel!;

        const settings = getDefaultGlobalSettings({
          user: this.user,
        });

        const context = {
          user: this.user,
          channel: thisChannel,
          // TODO(#63): Unify action infrastructure - fix generics
          actions: actions as unknown as Record<string, BottAction>,
          settings,
        };

        // 1. Get list of bot events (responses) from Gemini:
        const eventGenerator = generateEvents(
          eventHistoryResult,
          {
            ...context,
            abortSignal,
          },
        );

        // 2. Send one event at a time:
        for await (const genEvent of eventGenerator) {
          if (abortSignal.aborted) {
            throw new Error("Aborted task: before typing message");
          }

          if (genEvent.type !== BottEventType.REACTION) {
            this.startTyping();
          }

          switch (genEvent.type) {
            case BottEventType.ACTION_CALL: {
              let responsePromise;

              switch (
                (genEvent as BottActionCallEvent<AnyShape>).details.name
              ) {
                // We only have the "generateMedia" handler for now.
                case "generateMedia":
                default:
                  responsePromise = generateMedia(
                    genEvent as BottActionCallEvent<GenerateMediaOptions>,
                  );
                  break;
              }

              (async () => {
                try {
                  const responseEvent = await responsePromise;
                  responseEvent.parent = genEvent;

                  // Request/response events are system-only.
                  this.send({
                    id: crypto.randomUUID(),
                    type: genEvent.parent
                      ? BottEventType.REPLY
                      : BottEventType.MESSAGE,
                    details: {
                      content: responseEvent.details.content || "",
                    },
                    attachments: responseEvent.attachments,
                    createdAt: new Date(),
                    user: this.user,
                    channel: thisChannel,
                    parent: genEvent.parent,
                  });

                  // Also store the "response" event.
                  addEvents(responseEvent);
                } catch (error) {
                  log.warn("Failed to generate media:", error);

                  this.send(
                    await generateErrorMessage(
                      error,
                      genEvent as BottActionCallEvent<AnyShape>,
                      context,
                    ),
                  );
                }
              })();
              break;
            }
            case BottEventType.MESSAGE:
            case BottEventType.REPLY: {
              const words =
                (genEvent.details.content as string).split(/\s+/).length;
              const delayMs = (words / WORDS_PER_MINUTE) * MS_IN_MINUTE;
              const cappedDelayMs = Math.min(delayMs, MAX_TYPING_TIME_MS);
              await delay(cappedDelayMs, { signal: abortSignal });

              if (abortSignal.aborted) {
                throw new Error("Aborted task: after typing message");
              }
            } /* fall through */
            case BottEventType.REACTION: {
              this.send(genEvent);
              break;
            }
            default:
              break;
          }
        }
      }),
    );
  },
});

// Need to respond to GCP health probe:
Deno.serve(
  { port: PORT },
  () => new Response("OK", { status: 200 }),
);

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
