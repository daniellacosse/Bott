import type { Content } from "npm:@google/genai";
import { encodeBase64 } from "jsr:@std/encoding/base64";

import {
  type BottChannel,
  type BottEvent,
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
): AsyncGenerator<BottEvent> {
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
      await transformBottEventToContent({
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
    yield {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event,
      user: context.user,
      channel: context.channel,
      parent: event.parent ? (await getEvents(event.parent.id))[0] : undefined,
    };
  }

  return;
}

const transformBottEventToContent = async (
  event: BottEvent<{ content: string; seen: boolean }>,
  modelUserId: string,
): Promise<Content> => {
  const content: Content = {
    role: (event.user && event.user.id === modelUserId) ? "model" : "user",
    parts: [{ text: JSON.stringify(event) }],
  };

  if (event.files) {
    for (const file of event.files) {
      let fileData;

      if (file.data) {
        fileData = file.data;
      } else if (file.url) {
        const fileResponse = await fetch(file.url);
        const fileBuffer = await fileResponse.arrayBuffer();

        fileData = new Uint8Array(fileBuffer);
      }

      if (fileData === undefined) {
        continue;
      }

      content.parts!.push({
        inlineData: {
          mimeType: file.mimetype,
          data: encodeBase64(fileData),
        },
      });
    }
  }

  return content;
};
