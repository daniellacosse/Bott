import { setTimeout as sleep } from "node:timers/promises";

import { addEvents, type BottEvent } from "@bott/data";
import { startBot } from "@bott/discord";
import { messageChannel } from "@bott/gemini";

import { standardInstructions } from "./instructions/main.ts";
import commands from "./commands/main.ts";
import { noResponseMarker } from "./instructions/markers.ts";

startBot({
  commands,
  identityToken: Deno.env.get("DISCORD_TOKEN")!,
  mount() {
    console.info(
      `[INFO] @Bott running at id <@${this.id}>`,
    );
  },
  async event(event) {
    if (!event.channel) {
      return;
    }

    // 0. Persist event - TODO: create user/channel if not exist
    addEvents(event);

    // 1. Get response from gemini
    const baseMessageEvent: BottEvent = await messageChannel(
      event.channel,
      standardInstructions(
        this.id,
        event.channel.name,
        event.channel.description ?? "N/A",
      ),
    );

    // 2. Ignore or split
    const baseMessageText = baseMessageEvent.data.toString();
    if (baseMessageText === noResponseMarker) {
      return;
    }

    const messageTexts = splitMessagePreservingCodeBlocks(baseMessageText);

    // 3. Send events, writing to disk as we go
    for (const messageText of messageTexts) {
      this.sendTyping();

      const words = messageText.split(/\s+/).length;
      const delayMs = (words / this.wpm) * 60 * 1000;
      const cappedDelayMs = Math.min(delayMs, 7000);
      await sleep(cappedDelayMs);

      // TODO: change behavior based on reaction/reply
      addEvents(this.send(messageText));
    }
  },
});

function splitMessagePreservingCodeBlocks(message: string): string[] {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const placeholders: string[] = [];
  let placeholderIndex = 0;
  const placeholderPrefix = "__CODEBLOCK_PLACEHOLDER_";

  // 1. Replace code blocks with unique placeholders
  const placeholderString = message.replace(codeBlockRegex, (match) => {
    const placeholder = `${placeholderPrefix}${placeholderIndex}__`;
    placeholders[placeholderIndex] = match; // Store the original code block
    placeholderIndex++;
    return placeholder;
  });

  // 2. Split the string containing placeholders by \n\n+
  const initialParts = placeholderString.split(/\n\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  // 3. Restore code blocks into the parts
  const finalParts = initialParts.map((part) => {
    let restoredPart = part;
    // Iterate placeholders in reverse to handle potential nesting (though unlikely here)
    for (let i = placeholders.length - 1; i >= 0; i--) {
      restoredPart = restoredPart.replace(
        `${placeholderPrefix}${i}__`,
        placeholders[i],
      );
    }
    return restoredPart;
  });

  return finalParts;
}

// need to respond to GCP health probe
Deno.serve(
  { port: Number(Deno.env.get("PORT") ?? 8080) },
  () => new Response("OK", { status: 200 }),
);
