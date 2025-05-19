import { delay } from "jsr:@std/async/delay";

import { addEvents, getEventIdsForChannel, setSchema } from "@bott/data";
import { startBot } from "@bott/discord";

import { respondEvents } from "@bott/gemini";
import { getIdentity } from "./identity.ts";

import commands from "./commands/main.ts";
import { getEvents } from "../data/model/events.ts";

const MS_IN_MINUTE = 60 * 1000;
const MAX_TYPING_TIME_MS = 3000;

setSchema();

startBot({
  commands,
  identityToken: Deno.env.get("DISCORD_TOKEN")!,
  mount() {
    console.info(
      `[INFO] Running at id <@${this.user.id}>`,
    );
  },
  event(event) {
    if (!event.channel) {
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

    this.tasks.push(event.channel.id, async (abortSignal: AbortSignal) => {
      let eventHistoryResult;

      try {
        const eventHistoryIds = getEventIdsForChannel(event.channel!.id);
        eventHistoryResult = getEvents(...eventHistoryIds);
      } catch (error) {
        console.log("[ERROR] Failed to get channel history:", error);
        return;
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
          return;
        }

        if (messageEvent.type !== "reaction") {
          this.startTyping();
        }

        const words = messageEvent.details.content.split(/\s+/).length;
        const delayMs = (words / this.wpm) * MS_IN_MINUTE;
        const cappedDelayMs = Math.min(delayMs, MAX_TYPING_TIME_MS);
        await delay(cappedDelayMs);

        if (abortSignal.aborted) {
          return;
        }

        const result = await this.send(messageEvent);

        if (result && "id" in result) {
          messageEvent.id = result.id;
        }

        const eventTransaction = addEvents(messageEvent);
        if ("error" in eventTransaction) {
          console.error(
            "[ERROR] Failed to add event to database:",
            eventTransaction,
          );
        }
      }
    });
  },
});

// need to respond to GCP health probe
Deno.serve(
  { port: Number(Deno.env.get("PORT") ?? 8080) },
  () => new Response("OK", { status: 200 }),
);
