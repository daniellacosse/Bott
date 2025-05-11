// import { delay } from "jsr:@std/async/delay";

import { addEvents } from "@bott/data";
import { startBot } from "@bott/discord";

// TODO: messageChannel or whatever it is
// import { respondEvents } from "@bott/gemini";
// import { getIdentity } from "./instructions/main.ts";

import commands from "./commands/main.ts";

startBot({
  commands,
  identityToken: Deno.env.get("DISCORD_TOKEN")!,
  mount() {
    console.info(
      `[INFO] @Bott running at id <@${this.id}>`,
    );
  },
  event(event) {
    if (!event.channel) {
      return;
    }

    // 0. Persist event
    addEvents(event);

    this.tasks.push(event.channel.id, async (abortSignal: AbortSignal) => {
      // // 1. Get response from gemini
      // const events: BottEvent[] = await replyEvents({
      //   events: getChannelHistory(event.channel.id),
      //   context: getIdentity(
      //     this.id,
      //     event.channel!.name,
      //     event.channel?.description ?? "N/A",
      //   ),
      //   abortSignal,
      // });

      // // 2. Send events, writing to disk as we go
      // for (const event of events) {
      //   this.startTyping();

      //   const words = messageText.split(/\s+/).length;
      //   const delayMs = (words / this.wpm) * 60 * 1000;
      //   const cappedDelayMs = Math.min(delayMs, 7000);
      //   await delay(cappedDelayMs);

      //   if (abortSignal.aborted) {
      //     return;
      //   }

      //   // TODO:
      //   switch (event.type) { /* handle */ }

      //   addEvents(event);
      // }
    });
  },
});

// need to respond to GCP health probe
Deno.serve(
  { port: Number(Deno.env.get("PORT") ?? 8080) },
  () => new Response("OK", { status: 200 }),
);
