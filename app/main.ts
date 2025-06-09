import { delay } from "jsr:@std/async/delay";

import { type BottEvent, BottEventType, BottResponseEvent } from "@bott/model";
import {
  addEventData,
  getEventIdsForChannel,
  getEvents,
  startStorage,
} from "@bott/storage";
import { createTask } from "@bott/task";
import { startDiscordBot } from "@bott/discord";
import { generateEvents } from "@bott/gemini";

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

        // 1. Get list of bot events (responses) from Gemini:
        const eventGenerator = generateEvents<GenerateMediaOptions>(
          eventHistoryResult,
          {
            abortSignal,
            context: {
              identity: getIdentity({
                user: this.user,
              }),
              user: this.user,
              channel: event.channel!,
            },
            requestHandlers: [generateMedia],
          },
        );

        // 2. Send one event (message) at a time:
        for await (const event of eventGenerator) {
          if (abortSignal.aborted) {
            throw new Error("Aborted task: before typing message");
          }

          if (event.type !== BottEventType.REACTION) {
            this.startTyping();
          }

          switch (event.type) {
            case BottEventType.REQUEST:
              // We only have the "generateMedia" handler for now.
              generateMedia(event).then(
                async (responseEvent: BottResponseEvent) => {
                  await this.send(responseEvent);

                  responseEvent.parent = event;

                  addEventData(responseEvent);
                },
              );
              break;

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
              const result = await this.send(event as BottEvent);

              if (result && "id" in result) {
                event.id = result.id;
              }

              break;
            }
            default:
              break;
          }

          const eventTransaction = addEventData(event);
          if ("error" in eventTransaction) {
            console.error(
              "[ERROR] Failed to add event to database:",
              eventTransaction.error,
            );
          }
        }
      }),
    );
  },
});

// need to respond to GCP health probe
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
