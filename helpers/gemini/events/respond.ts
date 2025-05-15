import type { Content, Schema } from "npm:@google/genai";
import { Type } from "npm:@google/genai";

import gemini from "../client.ts";
import {
  type BottChannel,
  type BottEvent,
  BottEventType,
  type BottUser,
} from "@bott/data";

import baseInstructions from "./baseInstructions.ts";

type GeminiResponseContext = {
  abortSignal: AbortSignal;
  context: {
    identity: string;
    user: BottUser;
    channel: BottChannel;
  };
  model?: string;
};

// Define the schema for a single event object in the response
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

export const respondEvents = async (
  inputEvents: BottEvent[],
  { model = "gemini-2.5-pro-preview-05-06", abortSignal, context }:
    GeminiResponseContext,
): Promise<BottEvent[]> => {
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

  const response = await gemini.models.generateContent({
    model,
    contents,
    config: {
      abortSignal,
      candidateCount: 1,
      systemInstruction: context.identity + baseInstructions,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: outputEventSchema,
        description:
          "A list of event objects to send. Send an empty array if no response is warranted.",
      },
    },
  });

  // Only one candidate specified.
  const content = response.candidates![0].content;

  if (!content) {
    return [];
  }

  try {
    console.log("[DEBUG] Gemini content recieved. Parsing response.");
    return transformContentToBottEvents(content, context);
  } catch (error) {
    console.error("[ERROR] Problem processing Gemini content:", error);

    return [];
  }
};

const transformBottEventToContent = (
  event: BottEvent<{ content: string; seen: boolean }>,
  modelUserId: string,
): Content => ({
  role: (event.user && event.user.id === modelUserId) ? "model" : "user",
  parts: [{ text: JSON.stringify(event) }],
});

function transformContentToBottEvents(content: Content, context: {
  user: BottUser;
  channel: BottChannel;
}): BottEvent[] {
  if (!content.parts || content.parts.length === 0 || !content.parts[0].text) {
    console.warn(
      "[WARN] Gemini response content is empty or not in the expected format.",
    );
    return [];
  }

  const jsonString = content.parts[0].text;
  let parsedOutput: Partial<BottEvent>[];

  try {
    parsedOutput = JSON.parse(jsonString);
  } catch (error) {
    console.error(
      "[ERROR] Failed to parse Gemini response JSON:",
      error,
      "\nJSON string was:",
      jsonString,
    );
    return [];
  }

  if (!Array.isArray(parsedOutput)) {
    console.error(
      "[ERROR] Gemini response is not a JSON array as expected:",
      jsonString,
    );
    return [];
  }

  if (!parsedOutput.length) {
    console.log(
      "[DEBUG] Gemini opted not to respond.",
    );
    return [];
  }

  const result: BottEvent[] = [];

  for (const partialEvent of parsedOutput) {
    if (!partialEvent.details?.content) {
      continue;
    }

    const splitDetails = splitMessagePreservingCodeBlocks(
      partialEvent.details.content,
    );

    let type = partialEvent.type ?? BottEventType.MESSAGE;

    for (const messagePart of splitDetails) {
      result.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        ...partialEvent,
        user: context.user,
        channel: context.channel,
        type,
        details: { content: messagePart },
      });

      // Don't string multiple replies in the same message stream
      type = BottEventType.MESSAGE;
    }
  }

  return result;
}

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
