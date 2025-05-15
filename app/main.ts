import { delay } from "jsr:@std/async/delay";

import { addEvents, type BottEvent, getEventIdsForChannel } from "@bott/data";
import { startBot } from "@bott/discord";

import { respondEvents } from "@bott/gemini";
import { getIdentity } from "./identity.ts";

import commands from "./commands/main.ts";
import { getEvents } from "../data/model/events.ts";

const MS_IN_MINUTE = 60 * 1000;
const MAX_TYPING_TIME_MS = 3000;

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

    addEvents(event);

    this.tasks.push(event.channel.id, async (abortSignal: AbortSignal) => {
      // 1. Get list of bot events (responses) from Gemini:
      const messageEvents: BottEvent[] = await respondEvents(
        getEvents(...getEventIdsForChannel(event.channel!.id)),
        {
          abortSignal,
          identity: getIdentity({
            user: this.user,
            channel: event.channel!,
          }),
        },
      );

      // Send one event (message) at a time:
      for (const event of messageEvents) {
        if (abortSignal.aborted) {
          return;
        }

        this.startTyping();

        const words = event.details.content.split(/\s+/).length;
        const delayMs = (words / this.wpm) * MS_IN_MINUTE;
        const cappedDelayMs = Math.min(delayMs, MAX_TYPING_TIME_MS);
        await delay(cappedDelayMs);

        if (abortSignal.aborted) {
          return;
        }

        const result = await this.send(event);

        if (result && "id" in result) {
          event.id = result.id;
        }

        addEvents(event);
      }
    });
  },
});

// need to respond to GCP health probe
Deno.serve(
  { port: Number(Deno.env.get("PORT") ?? 8080) },
  () => new Response("OK", { status: 200 }),
);
