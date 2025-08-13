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
  type AnyBottEvent,
  type AnyShape,
  type BottEvent,
  BottEventType,
  type BottRequestEvent,
  type BottRequestHandler,
  BottRequestOptionType,
} from "@bott/model";
import { log } from "@bott/logger";
import type { GeminiEventScores } from "./types.ts";

import { Type as GeminiStructuredResponseType } from "npm:@google/genai";
import type {
  GenerateContentResponse,
  Part,
  Schema as GeminiStructuredResponseSchema,
} from "npm:@google/genai";

export type GeminiOutputEvent<O extends AnyShape> = Omit<
  | BottEvent
  | BottRequestEvent<O>,
  "id" | "timestamp"
>;

export type GeminiMultiPhaseResponse<O extends AnyShape> = {
  scoredInputEvents: AnyBottEvent[];
  filteredOutputEvents: GeminiOutputEvent<O>[];
};

export const getOutputEventSchema = <O extends AnyShape>(
  requestHandlers: BottRequestHandler<O, AnyShape>[],
): GeminiStructuredResponseSchema => ({
  type: GeminiStructuredResponseType.OBJECT,
  properties: {
    scoredInputEvents: {
      type: GeminiStructuredResponseType.ARRAY,
      description:
        "Array of input events with scores added to details.scores for informational purposes",
      items: {
        type: GeminiStructuredResponseType.OBJECT,
        properties: {
          id: { type: GeminiStructuredResponseType.STRING },
          type: { type: GeminiStructuredResponseType.STRING },
          details: {
            type: GeminiStructuredResponseType.OBJECT,
            properties: {
              content: { type: GeminiStructuredResponseType.STRING },
              seen: { type: GeminiStructuredResponseType.BOOLEAN },
              scores: {
                type: GeminiStructuredResponseType.OBJECT,
                description: "Scores for incoming events (1-5 scale)",
                properties: {
                  seriousness: {
                    type: GeminiStructuredResponseType.NUMBER,
                    description: "1=very sarcastic, 5=very serious",
                  },
                  importance: {
                    type: GeminiStructuredResponseType.NUMBER,
                    description: "1=low priority, 5=high priority",
                  },
                  directedAtBott: {
                    type: GeminiStructuredResponseType.NUMBER,
                    description: "1=not directed, 5=directly addressed",
                  },
                  factCheckingNeed: {
                    type: GeminiStructuredResponseType.NUMBER,
                    description: "1=no checking needed, 5=needs verification",
                  },
                  supportNeed: {
                    type: GeminiStructuredResponseType.NUMBER,
                    description: "1=no support needed, 5=needs help",
                  },
                },
              },
            },
          },
          timestamp: { type: GeminiStructuredResponseType.STRING },
          user: {
            type: GeminiStructuredResponseType.OBJECT,
            properties: {
              id: { type: GeminiStructuredResponseType.STRING },
              name: { type: GeminiStructuredResponseType.STRING },
            },
          },
          channel: {
            type: GeminiStructuredResponseType.OBJECT,
            properties: {
              id: { type: GeminiStructuredResponseType.STRING },
              name: { type: GeminiStructuredResponseType.STRING },
              description: { type: GeminiStructuredResponseType.STRING },
            },
          },
          parent: {
            type: GeminiStructuredResponseType.OBJECT,
            properties: {
              id: { type: GeminiStructuredResponseType.STRING },
            },
          },
        },
      },
    },
    filteredOutputEvents: {
      type: GeminiStructuredResponseType.ARRAY,
      description:
        "Array of filtered outgoing events from Phase 5, empty array if no response warranted",
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
                  "Content of the message or reaction. Use descriptive slugs in examples.",
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
                required: requestHandlers.flatMap((handler) =>
                  handler.options?.filter((option) => option.required).map(
                    (option) => option.name,
                  ) ?? []
                ),
              },
              scores: {
                type: GeminiStructuredResponseType.OBJECT,
                description: "Scores for outgoing events (1-5 scale)",
                properties: {
                  relevance: {
                    type: GeminiStructuredResponseType.NUMBER,
                    description: "1-5: How relevant to current conversation",
                  },
                  redundancy: {
                    type: GeminiStructuredResponseType.NUMBER,
                    description: "1=very redundant, 5=adds new value",
                  },
                  wordiness: {
                    type: GeminiStructuredResponseType.NUMBER,
                    description: "1=too verbose, 5=appropriately concise",
                  },
                  necessity: {
                    type: GeminiStructuredResponseType.NUMBER,
                    description: "1-5: How necessary for conversation flow",
                  },
                },
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
      },
    },
  },
  required: ["scoredInputEvents", "filteredOutputEvents"],
  description:
    "Multi-phase evaluation result with scored input events and filtered output events",
});

// processMultiPhaseResponse handles the complete structured response from Gemini
// and extracts the multi-phase evaluation results.
export function processMultiPhaseResponse<O extends AnyShape>(
  geminiResponse: GenerateContentResponse,
): GeminiMultiPhaseResponse<O> {
  const responseText = geminiResponse.candidates?.[0]?.content?.parts
    ?.filter((part: Part) => "text" in part && typeof part.text === "string")
    .map((part: Part) => (part as { text: string }).text)
    .join("") ?? "";

  if (!responseText) {
    log.warn("Empty response from Gemini");
    return {
      scoredInputEvents: [],
      filteredOutputEvents: [],
    };
  }

  try {
    const parsed = JSON.parse(responseText) as GeminiMultiPhaseResponse<O>;

    // Trust Gemini's output structure, only validate basic presence
    return {
      scoredInputEvents: parsed.scoredInputEvents || [],
      filteredOutputEvents: parsed.filteredOutputEvents || [],
    };
  } catch (error) {
    log.error("Failed to parse multi-phase response:", {
      error,
      responseText: responseText.substring(0, 200),
    });
    return {
      scoredInputEvents: [],
      filteredOutputEvents: [],
    };
  }
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
