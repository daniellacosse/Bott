import type { Content, Part } from "npm:@google/genai";
import { encodeBase64 } from "jsr:@std/encoding/base64";

import type {
  AnyBottEvent,
  BottChannel,
  BottEvent,
  BottUser,
} from "@bott/model";

import { getEvents } from "@bott/storage";

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
  inputEvents: AnyBottEvent[],
  { model = "gemini-2.5-pro-preview-05-06", abortSignal, context }:
    GeminiResponseContext,
): AsyncGenerator<
  BottEvent<
    { content: string }
  >
> {
  const modelUserId = context.user.id;

  const contents: Content[] = [];
  let pointer = inputEvents.length;
  let goingOverSeenEvents = false;

  // We only want the model to respond to the most recent user messages,
  // since the model's last response
  while (pointer--) {
    const event = {
      ...inputEvents[pointer],
      details: { ...inputEvents[pointer].details },
    };

    if (event.user?.id === modelUserId) {
      goingOverSeenEvents = true;
    }

    if (goingOverSeenEvents) {
      delete event.assets;
    }

    const content = transformBottEventToContent({
      ...event,
      details: { ...event.details, seen: goingOverSeenEvents },
    } as BottEvent<object & { seen: boolean }>, modelUserId);

    contents.unshift(content);
  }

  if (contents.length === 0) {
    return;
  }

  const responseGenerator = await gemini.models.generateContentStream({
    model,
    contents,
    config: {
      abortSignal,
      candidateCount: 1,
      systemInstruction: {
        parts: [{ text: context.identity + taskInstructions }],
      },
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
    } as BottEvent<
      { content: string }
    >;
  }

  return;
}

const transformBottEventToContent = (
  event: BottEvent<object & { seen: boolean }>,
  modelUserId: string,
): Content => {
  const { assets, ...eventForStringify } = event;

  const parts: Part[] = [{ text: JSON.stringify(eventForStringify) }];

  const content: Content = {
    role: (event.user && event.user.id === modelUserId) ? "model" : "user",
    parts,
  };

  if (assets) {
    for (const asset of assets) {
      parts.push({
        inlineData: {
          mimeType: asset.type,
          data: encodeBase64(asset.data),
        },
      });
    }
  }
  return content;
};
