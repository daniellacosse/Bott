import type { Content, Schema } from "npm:@google/genai";
import { Type } from "npm:@google/genai";

import { JsonParseStream } from "jsr:@std/json";

import gemini from "../client.ts";
import {
  type BottChannel,
  type BottEvent,
  BottEventType,
  type BottUser,
  getEvents,
} from "@bott/data";

import taskInstructions from "./instructions.ts";

type GeminiResponseContext = {
  abortSignal: AbortSignal;
  context: {
    identity: string;
    user: BottUser;
    channel: BottChannel;
  };
  model?: string;
};

interface GeminiOutputEvent {
  type: BottEventType;
  details: {
    content: string;
  };
  parent?: {
    id: string;
  };
}

// Define the schema for a single output event object in the response
const outputEventSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: [
        BottEventType.MESSAGE,
        BottEventType.REPLY,
        BottEventType.REACTION,
      ],
      description:
        "The type of event to send: 'message', 'reply', or 'reaction'.",
    },
    details: {
      type: Type.OBJECT,
      properties: {
        content: {
          type: Type.STRING,
          description:
            "The content of the message or reaction (e.g., an emoji for reactions).",
        },
      },
      required: ["content"],
    },
    parent: {
      type: Type.OBJECT,
      properties: {
        id: {
          type: Type.STRING,
          description:
            "The string ID of the message being replied or reacted to. Required if 'parent' object is present.",
        },
      },
      required: ["id"],
    },
  },
  required: ["type", "details"],
  description:
    "An event object representing an action to take (message, reply, or reaction).",
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
      responseSchema: {
        type: Type.ARRAY,
        items: outputEventSchema,
        description:
          "A list of event objects to send. Send an empty array if no response is warranted.",
      },
    },
  });

  for await (const event of outputEventGenerator(responseGenerator)) {
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

// To gain access to partial JSON parsing, we must
// convert to ReadableStream and back again...
async function* outputEventGenerator(
  responseStream: AsyncGenerator<any>,
): AsyncGenerator<
  GeminiOutputEvent
> {
  const jsonStreamReader = ReadableStream.from(responseStream).pipeThrough(
    new TransformStream<any, string>({
      transform(chunk, controller) {
        console.log("[DEBUG] transform chunk:", chunk);

        // TODO: extract function calls and files?
        if (chunk.content && chunk.content.parts) {
          for (const part of chunk.content.parts) {
            if ("text" in part) {
              controller.enqueue(part.text);
            }
          }
        }
      },
    }),
  )
    .pipeThrough(
      new JsonParseStream(),
    ).getReader();

  while (true) {
    const { done, value } = await jsonStreamReader.read();

    if (done) {
      break;
    }

    console.log("[DEBUG] Recieved JSON object:", value);

    if (
      isGeminiOutputEvent(value)
    ) {
      yield value;
    }
  }

  return;
}

function isGeminiOutputEvent(obj: unknown): obj is GeminiOutputEvent {
  if (
    typeof obj !== "object" || obj === null || obj === undefined ||
    Array.isArray(obj)
  ) {
    return false;
  }

  const event = obj as Record<string, any>;

  if (
    typeof event.type !== "string" ||
    !Object.values(BottEventType).includes(event.type as BottEventType)
  ) {
    return false;
  }

  if (
    typeof event.details !== "object" || event.details === null ||
    typeof event.details.content !== "string"
  ) {
    return false;
  }

  if (
    event.parent !== undefined &&
    (typeof event.parent !== "object" || event.parent === null ||
      typeof event.parent.id !== "string")
  ) {
    return false;
  }

  return true;
}
