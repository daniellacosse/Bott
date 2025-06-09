import {
  type AnyShape,
  type BottEvent,
  BottEventType,
  type BottRequestEvent,
  isBottEvent,
} from "@bott/model";

import { Type as GeminiStructuredResponseType } from "npm:@google/genai";
import type {
  GenerateContentResponse,
  Schema as GeminiStructuredResponseSchema,
} from "npm:@google/genai";

export type GeminiOutputEvent<O extends AnyShape> =
  | BottEvent
  | BottRequestEvent<O>;

export const outputEventSchema: GeminiStructuredResponseSchema = {
  type: GeminiStructuredResponseType.ARRAY,
  items: {
    type: GeminiStructuredResponseType.OBJECT,
    properties: {
      type: {
        type: GeminiStructuredResponseType.STRING,
        enum: [
          BottEventType.MESSAGE,
          BottEventType.REPLY,
          BottEventType.REACTION,
        ],
        description:
          "The type of event to send: 'message', 'reply', or 'reaction'.",
      },
      details: {
        type: GeminiStructuredResponseType.OBJECT,
        properties: {
          content: {
            type: GeminiStructuredResponseType.STRING,
            description:
              "The content of the message or reaction (e.g., an emoji for reactions).",
          },
        },
        required: ["content"],
      },
      parent: {
        type: GeminiStructuredResponseType.OBJECT,
        properties: {
          id: {
            type: GeminiStructuredResponseType.STRING,
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
  },
  description:
    "A list of event objects to send. Send an empty array if no response is warranted.",
};

// outputEventStream processes the structured content stream from Gemini,
// extracting and yielding GeminiOutputEvent objects.
export async function* outputEventStream<O extends AnyShape>(
  geminiResponseStream: AsyncGenerator<GenerateContentResponse>,
): AsyncGenerator<
  GeminiOutputEvent<O>
> {
  let buffer = "";
  let firstChunkProcessed = false;

  for await (const streamPart of geminiResponseStream) {
    let textFromPart = "";
    for (const part of streamPart.candidates?.[0]?.content?.parts ?? []) {
      if (part.text) {
        textFromPart += part.text;
      }

      if (
        part.functionCall && part.functionCall.name
      ) {
        yield {
          type: BottEventType.REQUEST,
          details: {
            name: part.functionCall.name,
            options: part.functionCall.args,
          },
        };
      }
    }

    if (textFromPart) {
      buffer += textFromPart;
    }

    // Attempt to strip leading array bracket `[` and whitespace, only once from the beginning of the stream.
    if (!firstChunkProcessed && buffer.length > 0) {
      const initialBracketMatch = buffer.match(/^\s*\[\s*/);
      if (initialBracketMatch) {
        buffer = buffer.substring(initialBracketMatch[0].length);
      }
      firstChunkProcessed = true;
    }

    const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
      buffer,
    );
    for (const event of extractedObjects) {
      if (isBottEvent(event)) {
        yield event;
      }
    }
    buffer = remainder;
  }

  // After the stream has finished, attempt to parse any remaining content in the buffer.
  if (buffer.length > 0) {
    const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
      buffer,
    );
    for (const event of extractedObjects) {
      if (isBottEvent(event)) {
        yield event;
      }
    }

    const finalTrimmedBuffer = remainder.trim();
    if (finalTrimmedBuffer.length > 0 && finalTrimmedBuffer !== "]") {
      const warningMessage = finalTrimmedBuffer.startsWith("{")
        ? "[WARN] Stream ended with what appears to be an incomplete JSON object in buffer:"
        : "[WARN] Stream ended with unprocessed trailing data in buffer:";
      console.warn(
        warningMessage,
        finalTrimmedBuffer.substring(0, 200) +
          (finalTrimmedBuffer.length > 200 ? "..." : ""),
      );
    }
  }

  return;
}

// _extractTopLevelObjectsFromString attempts to extract and parse complete JSON objects
// from the provided buffer string.
export function _extractTopLevelObjectsFromString(
  input: string,
): {
  extractedObjects: Record<string, unknown>[];
  remainder: string;
} {
  let current = input;
  const extractedObjects: Record<string, unknown>[] = [];

  // pointers
  let objectStartIndex = -1;
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  // This loop allows restarting parsing from the beginning of the
  // (potentially modified) buffer after an object is successfully extracted.
  // eslint-disable-next-line no-constant-condition
  parseLoop: while (true) {
    // 1. Decide to continue, reset, or break:
    if (objectStartIndex === -1) {
      objectStartIndex = current.indexOf("{");
      if (objectStartIndex === -1) {
        break parseLoop;
      }

      depth = 0;
      inString = false;
      escapeNext = false;
    }

    // 2. Scan for the end of the current object from objectStartIndex:
    for (let i = objectStartIndex; i < current.length; i++) {
      const char = current[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === "\\") {
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
      }

      if (!inString) {
        if (char === "{") {
          depth++;
        } else if (char === "}" && depth > 0) {
          depth--;
          if (depth === 0) { // Found a complete top-level object
            const objString = current.substring(
              objectStartIndex,
              i + 1,
            );
            try {
              extractedObjects.push(JSON.parse(objString));
            } catch (error) {
              console.error("Failed to parse JSON object:", error);
            }
            current = current.substring(i + 1);
            const commaMatch = current.match(/^\s*,\s*/);
            if (commaMatch) {
              current = current.substring(commaMatch[0].length);
            }
            objectStartIndex = -1;
            continue parseLoop;
          }
        }
      }
    }

    // If the inner for-loop completes, the current object is not yet complete in the buffer,
    // or no new object was started.
    break parseLoop;
  }

  return {
    extractedObjects,
    remainder: current,
  };
}
