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

import { delay } from "jsr:@std/async";

import {
  type AnyShape,
  BottEventType,
  BottRequestEvent,
  BottResponseEvent,
} from "@bott/model";
import {
  addEventData,
  getEventIdsForChannel,
  getEvents,
  startStorage,
  storeNewInputFile,
} from "@bott/storage";
import { createTask } from "@bott/task";
import { startDiscordBot } from "@bott/discord";
import { generateErrorMessage, generateEvents } from "@bott/gemini";

import { taskManager } from "./tasks.ts";
import { getIdentity } from "./identity.ts";
import { help } from "./requestHandlers/help.ts";
import {
  generateMedia,
  GenerateMediaOptions,
} from "./requestHandlers/generateMedia.ts";
import { STORAGE_DEPLOY_NONCE_PATH, STORAGE_ROOT } from "./constants.ts";

const WORDS_PER_MINUTE = 200;
const MS_IN_MINUTE = 60 * 1000;
const MAX_TYPING_TIME_MS = 3000;
const DEFAULT_RESPONSE_SWAPS = 6;

startStorage(STORAGE_ROOT);

// Set up deploy check:
const deployNonce = crypto.randomUUID();

Deno.writeTextFileSync(STORAGE_DEPLOY_NONCE_PATH, deployNonce);

startDiscordBot({
  addEventData,
  storeNewInputFile,
  requestHandlerCommands: [help],
  identityToken: Deno.env.get("DISCORD_TOKEN")!,
  mount() {
    console.info(
      `[INFO] Running bot "${this.user.name}" at user id "<@${this.user.id}>"`,
    );
  },
  event(event) {
    if (deployNonce !== _getCurrentDeployNonce()) {
      console.debug("[DEBUG] Deploy nonce mismatch, ignoring event.");
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

    const result = addEventData(event);

    if ("error" in result) {
      console.error("[ERROR] Failed to add event to database:", result);
      return;
    }

    if (!taskManager.has(event.channel.name)) {
      taskManager.add({
        name: event.channel.name,
        remainingSwaps: DEFAULT_RESPONSE_SWAPS,
        record: [],
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

        const context = {
          identity: getIdentity({
            user: this.user,
          }),
          user: this.user,
          channel: event.channel!,
        };

        // 1. Get list of bot events (responses) from Gemini:
        const eventGenerator = generateEvents<GenerateMediaOptions>(
          eventHistoryResult,
          {
            abortSignal,
            context,
            getEvents,
            requestHandlers: [generateMedia],
          },
        );

        // 2. Send one event at a time:
        for await (const event of eventGenerator) {
          if (abortSignal.aborted) {
            throw new Error("Aborted task: before typing message");
          }

          if (event.type !== BottEventType.REACTION) {
            this.startTyping();
          }

          switch (event.type) {
            case BottEventType.REQUEST: {
              let responsePromise;

              switch ((event as BottRequestEvent<AnyShape>).details.name) {
                // We only have the "generateMedia" handler for now.
                case "generateMedia":
                default:
                  responsePromise = generateMedia(
                    event as BottRequestEvent<GenerateMediaOptions>,
                  );
                  break;
              }

              // We don't want to await here, it will hold up the process.
              if ("then" in responsePromise) {
                responsePromise.then(
                  (responseEvent: BottResponseEvent) => {
                    responseEvent.parent = event;

                    // Request/response events are system-only.
                    this.send({
                      id: crypto.randomUUID(),
                      type: event.parent
                        ? BottEventType.REPLY
                        : BottEventType.MESSAGE,
                      details: {
                        content: responseEvent.details.content || "",
                      },
                      files: responseEvent.files,
                      timestamp: new Date(),
                      user: this.user,
                      channel: event.channel,
                      parent: event.parent,
                    });

                    addEventData(responseEvent);
                  },
                ).catch(async (error) => {
                  console.warn("[WARN] Failed to generate media:", error);
                  this.send(
                    await generateErrorMessage(
                      error,
                      event as BottRequestEvent<AnyShape>,
                      context,
                    ),
                  );
                });
              }
              break;
            }
            case BottEventType.MESSAGE:
            case BottEventType.REPLY: {
              const words = event.details.content.split(/\s+/).length;
              const delayMs = (words / WORDS_PER_MINUTE) * MS_IN_MINUTE;
              const cappedDelayMs = Math.min(delayMs, MAX_TYPING_TIME_MS);
              await delay(cappedDelayMs, { signal: abortSignal });

              if (abortSignal.aborted) {
                throw new Error("Aborted task: after typing message");
              }
            } /* fall through */
            case BottEventType.REACTION: {
              this.send(event);
              return;
            }
            default:
              return;
          }
        }
      }),
    );
  },
});

// Need to respond to GCP health probe:
Deno.serve(
  { port: Number(Deno.env.get("PORT") ?? 8080) },
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
