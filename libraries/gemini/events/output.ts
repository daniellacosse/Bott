/**
 * @license
 * This file is part of Bott.
 *
 * This project is dual-licensed:
 * - Non-commercial use: AGPLv3 (see LICENSE file for full text).
 * - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
 *
 * Copyright (C) 2025 DanielLaCos.se
 */

import {
  type AnyShape,
  type BottEvent,
  BottEventType,
  type BottRequestEvent,
  type BottRequestHandler,
  BottRequestOptionType,
} from "@bott/model";
import { log } from "@bott/logger";

import { Type as GeminiStructuredResponseType } from "@google/genai";
import type {
  GenerateContentResponse,
  Part,
  Schema as GeminiStructuredResponseSchema,
} from "@google/genai";

export type GeminiOutputEvent<O extends AnyShape> = Omit<
  | BottEvent
  | BottRequestEvent<O>,
  "id" | "timestamp"
>;

export const getOutputEventSchema = <O extends AnyShape>(
  requestHandlers: BottRequestHandler<O, AnyShape>[],
): GeminiStructuredResponseSchema => ({
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
          BottEventType.REQUEST,
        ],
        description:
          "The type of event to send: 'message', 'reply', 'reaction', or 'request'.",
      },
      details: {
        type: GeminiStructuredResponseType.OBJECT,
        properties: {
          content: {
            type: GeminiStructuredResponseType.STRING,
            description:
              "The content of the message or reaction (e.g., an emoji for reactions). Required if event is of type 'message', 'reply', or 'reaction'.",
          },
          name: {
            type: GeminiStructuredResponseType.STRING,
            enum: requestHandlers.map((handler) => handler.name),
            description:
              "The name of the request to make. Required if event is of type 'request'.",
          },
          options: {
            type: GeminiStructuredResponseType.OBJECT,
            description:
              "The options to pass to the request. Required if event is of type 'request'.",
            properties: requestHandlers.reduce((acc, handler) => {
              if (!handler.options) {
                return acc;
              }

              for (const option of handler.options) {
                let type: GeminiStructuredResponseType;

                switch (option.type) {
                  case BottRequestOptionType.INTEGER:
                    type = GeminiStructuredResponseType.NUMBER;
                    break;
                  case BottRequestOptionType.BOOLEAN:
                    type = GeminiStructuredResponseType.BOOLEAN;
                    break;
                  case BottRequestOptionType.STRING:
                  default:
                    type = GeminiStructuredResponseType.STRING;
                    break;
                }

                acc[option.name] = {
                  type,
                  description:
                    `${option.description} Required for a "request" of name "${handler.name}"`,
                  enum: option.allowedValues,
                };
              }

              return acc;
            }, {} as Record<string, GeminiStructuredResponseSchema>),
            // This is weird, as we are flattening the requirements
            // across all calls, but we can just ignore the parameters
            // we don't need in a given context.
            required: requestHandlers.flatMap((handler) =>
              handler.options?.filter((option) => option.required).map(
                (option) => option.name,
              ) ?? []
            ),
          },
        },
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
});

// outputGenerator processes the structured content stream from Gemini,
// extracting and yielding GeminiOutputEvent objects.
export async function* outputEventStream<O extends AnyShape>(
  geminiResponseStream: AsyncGenerator<GenerateContentResponse>,
): AsyncGenerator<
  GeminiOutputEvent<O>
> {
  let buffer = "";
  let firstChunkProcessed = false;

  for await (const streamPart of geminiResponseStream) {
    const textFromPart = streamPart.candidates?.[0]?.content?.parts
      ?.filter((part: Part) => "text" in part && typeof part.text === "string")
      .map((part: Part) => (part as { text: string }).text)
      .join("") ?? "";

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
      if (_isGeminiOutputEvent(event)) {
        yield event as GeminiOutputEvent<O>;
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
      if (_isGeminiOutputEvent(event)) {
        yield event as GeminiOutputEvent<O>;
      }
    }

    const finalTrimmedBuffer = remainder.trim();
    if (finalTrimmedBuffer.length > 0 && finalTrimmedBuffer !== "]") {
      const warningMessage = finalTrimmedBuffer.startsWith("{")
        ? "Stream ended with what appears to be an incomplete JSON object in buffer:"
        : "Stream ended with unprocessed trailing data in buffer:";
      log.warn(
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
              log.error("Failed to parse JSON object:", error);
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

function _isGeminiOutputEvent(
  obj: unknown,
): obj is GeminiOutputEvent<AnyShape> {
  if (
    typeof obj !== "object" || obj === null || obj === undefined ||
    Array.isArray(obj)
  ) {
    return false;
  }

  // deno-lint-ignore no-explicit-any
  const event = obj as Record<string, any>;

  if (
    typeof event.type !== "string" ||
    !Object.values(BottEventType).includes(event.type as BottEventType)
  ) {
    return false;
  }

  if (typeof event.details !== "object" || event.details === null) {
    return false;
  }

  if (event.type === BottEventType.REQUEST) {
    if (
      typeof event.details.name !== "string" ||
      typeof event.details.options !== "object" ||
      event.details.options === null
    ) {
      return false;
    }
  } else { // For MESSAGE, REPLY, REACTION.
    if (typeof event.details.content !== "string") {
      return false;
    }
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
