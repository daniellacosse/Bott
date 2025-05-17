import type { Content } from "npm:@google/genai";

import {
  type BottChannel,
  type BottEvent,
  BottEventType,
  type BottUser,
  getEvents,
} from "@bott/data";

import taskInstructions from "./instructions.ts";
import { outputGenerator, outputSchema } from "./output.ts";
import gemini from "../client.ts";

type GeminiResponseContext = {
  abortSignal: AbortSignal;
  context: {
    identity: string;
    user: BottUser;
    channel: BottChannel;
  };
  model?: string;
};

export async function* respondEvents(
  inputEvents: BottEvent[],
  { model = "gemini-2.5-pro-preview-05-06", abortSignal, context }:
    GeminiResponseContext,
): AsyncGenerator<BottEvent[]> {
  const modelUserId = context.user.id;

  const contents: Content[] = [];
  let pointer = inputEvents.length;
  let hasBeenSeen = false;

  // We only want the model to respond to the most recent user messages,
  // since the model's last response
  while (pointer--) {
    const event = inputEvents[pointer];

    if (event.user?.id === modelUserId) {
      hasBeenSeen = true;
    }

    contents.unshift(
      transformBottEventToContent({
        ...event,
        details: { ...event.details, seen: hasBeenSeen },
      }, modelUserId),
    );
  }

  const responseGenerator = await gemini.models.generateContentStream({
    model,
    contents,
    config: {
      abortSignal,
      candidateCount: 1,
      systemInstruction: context.identity + taskInstructions,
      // TODO: Can't use google search w/ structured output.
      // tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: outputSchema,
    },
  });

  for await (const event of outputGenerator(responseGenerator)) {
    const result: BottEvent[] = [];

    const splitDetails = splitMessagePreservingCodeBlocks(
      event.details.content,
    );

    let type = event.type;

    for (const messagePart of splitDetails) {
      result.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        ...event,
        user: context.user,
        channel: context.channel,
        parent: event.parent ? getEvents(event.parent.id)[0] : undefined,
        type,
        details: { content: messagePart },
      });

      // Don't string multiple replies in the same message stream
      type = BottEventType.MESSAGE;
    }

    yield result;
  }

  return;
}

const transformBottEventToContent = (
  event: BottEvent<{ content: string; seen: boolean }>,
  modelUserId: string,
): Content => ({
  role: (event.user && event.user.id === modelUserId) ? "model" : "user",
  parts: [{ text: JSON.stringify(event) }],
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
