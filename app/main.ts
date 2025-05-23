import { delay } from "jsr:@std/async/delay";

import {
  addEvents,
  getEventIdsForChannel,
  getEvents,
  initClient,
  setSchema,
} from "@bott/data";
import { createTask, startBot } from "@bott/discord";
import { respondEvents } from "@bott/gemini";

import { getIdentity } from "./identity.ts";
import commands from "./commands/main.ts";
import {
  FILE_SYSTEM_DB_PATH,
  FILE_SYSTEM_DEPLOY_NONCE_PATH,
  FILE_SYSTEM_ROOT,
} from "./constants.ts";

const MS_IN_MINUTE = 60 * 1000;
const MAX_TYPING_TIME_MS = 3000;
const DEFAULT_RESPONSE_SWAPS = 6;

// set up file system
Deno.mkdirSync(FILE_SYSTEM_ROOT, {
  recursive: true,
});

// set up db
initClient(FILE_SYSTEM_DB_PATH);

setSchema();

// set up deploy check
const deployNonce = crypto.randomUUID();

Deno.writeTextFileSync(FILE_SYSTEM_DEPLOY_NONCE_PATH, deployNonce);

const getCurrentDeployNonce = () => {
  try {
    return Deno.readTextFileSync(FILE_SYSTEM_DEPLOY_NONCE_PATH);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }

    throw error;
  }
};

// start bot
startBot({
  commands,
  identityToken: Deno.env.get("DISCORD_TOKEN")!,
  mount() {
    console.info(
      `[INFO] Running bot ${this.user.name} at user id <@${this.user.id}>`,
    );
  },
  event(event) {
    if (deployNonce !== getCurrentDeployNonce()) {
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

    const result = addEvents(event);

    if ("error" in result) {
      console.error("[ERROR] Failed to add event to database:", result);
      return;
    }

    if (!this.tasks.has(event.channel.name)) {
      this.tasks.add({
        name: event.channel.name,
        remainingSwaps: DEFAULT_RESPONSE_SWAPS,
        record: [],
        config: {
          maximumSequentialSwaps: DEFAULT_RESPONSE_SWAPS,
        },
      });
    }

    this.tasks.push(
      event.channel.name,
      createTask(async (abortSignal: AbortSignal) => {
        let eventHistoryResult;

        try {
          const eventHistoryIds = getEventIdsForChannel(event.channel!.id);
          eventHistoryResult = getEvents(...eventHistoryIds);
        } catch (error) {
          throw new Error("Failed to get channel history.", {
            cause: error,
          });
        }

        if (abortSignal.aborted) {
          throw new Error("Aborted task: before getting event generator");
        }

        // 1. Get list of bot events (responses) from Gemini:
        const messageEventGenerator = respondEvents(
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
          },
        );

        // Send one event (message) at a time:
        for await (const messageEvent of messageEventGenerator) {
          if (abortSignal.aborted) {
            throw new Error("Aborted task: before typing message");
          }

          if (messageEvent.type !== "reaction") {
            this.startTyping();
          }

          const words = messageEvent.details.content.split(/\s+/).length;
          const delayMs = (words / this.wpm) * MS_IN_MINUTE;
          const cappedDelayMs = Math.min(delayMs, MAX_TYPING_TIME_MS);
          await delay(cappedDelayMs, { signal: abortSignal });

          if (abortSignal.aborted) {
            throw new Error("Aborted task: after typing message");
          }

          const result = await this.send(messageEvent);

          if (result && "id" in result) {
            messageEvent.id = result.id;
          }

          const eventTransaction = addEvents(messageEvent);
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
