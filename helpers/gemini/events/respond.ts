import type { Content } from "npm:@google/genai";

import gemini from "../client.ts";
import { type BottEvent, EventType as BottEventType } from "@bott/data";

import baseInstructions from "./baseInstructions.ts";

type GeminiResponseContext = {
  abortSignal: AbortSignal;
  identity: string;
  model?: string;
};

export const respondEvents = async (
  inputEvents: BottEvent[],
  { model = "gemini-2.5-pro-preview-05-06", abortSignal, identity }:
    GeminiResponseContext,
): Promise<BottEvent[]> => {
  // TODO: explicitly pass in model id?
  const modelIdMatch = identity.match(/<@(\d+)>/);
  const modelUserId = modelIdMatch ? Number(modelIdMatch[1]) : -1;

  if (modelUserId === -1) {
    console.error(
      "[ERROR] Could not extract modelUserId from identity string. Bot messages might be misattributed in history sent to Gemini.",
    );

    return [];
  }

  const contents: Content[] = inputEvents.map((event) =>
    transformBottEventToContent(event, modelUserId)
  );

  const response = await gemini.models.generateContent({
    model,
    contents,
    config: {
      abortSignal,
      candidateCount: 1,
      systemInstruction: identity + baseInstructions,
      tools: [{ googleSearch: {} }],
    },
  });

  // Only one candidate specified.
  const content = response.candidates![0].content;

  if (!content) {
    return [];
  }

  try {
    return transformContentToBottEvents(content);
  } catch (error) {
    console.error("[ERROR] Problem processing Gemini content:", error);

    return [];
  }
};

const transformBottEventToContent = (
  event: BottEvent,
  modelUserId: number,
): Content => ({
  role: (event.user && event.user.id === modelUserId) ? "model" : "user",
  parts: [{ text: JSON.stringify(event) }],
});

function transformContentToBottEvents(content: Content): BottEvent[] {
  if (!content.parts || content.parts.length === 0 || !content.parts[0].text) {
    console.warn(
      "[WARN] Gemini response content is empty or not in the expected format.",
    );
    return [];
  }

  const jsonString = content.parts[0].text;
  let parsedOutput: Partial<BottEvent>[];
  const result: BottEvent[] = [];

  try {
    parsedOutput = JSON.parse(jsonString);
  } catch (error) {
    console.error(
      "[ERROR] Failed to parse Gemini response JSON:",
      error,
      "\nJSON string was:",
      jsonString,
    );
    return result;
  }

  if (!Array.isArray(parsedOutput)) {
    console.error(
      "[ERROR] Gemini response is not a JSON array as expected:",
      jsonString,
    );
    return result;
  }

  for (const partialEvent of parsedOutput) {
    if (!partialEvent.details) {
      continue;
    }

    result.push({
      id: partialEvent.id ??
        Math.round(Math.random() * Number.MAX_SAFE_INTEGER),
      type: partialEvent.type ?? BottEventType.MESSAGE,
      details: partialEvent.details,
      timestamp: new Date(),
      ...partialEvent,
    });
  }

  return result;
}

export function splitMessagePreservingCodeBlocks(message: string): string[] {
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
