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

import type { BottAction } from "@bott/actions";
import { BottActionEventType } from "@bott/actions";
import {
  type BottChannel,
  BottEventType,
  type BottGlobalSettings,
  type BottUser,
} from "@bott/model";

import {
  type Schema as GeminiStructuredResponseSchema,
  Type as GeminiStructuredResponseType,
} from "@google/genai";

export const getEventSchema = (
  context: {
    user: BottUser;
    channel: BottChannel;
    actions: Record<string, BottAction>;
    settings: BottGlobalSettings;
  },
): GeminiStructuredResponseSchema => ({
  type: GeminiStructuredResponseType.ARRAY,
  description:
    "The final array of events you have generated and approved for response to the input.",
  items: {
    anyOf: [
      {
        type: GeminiStructuredResponseType.OBJECT,
        description: "Schema for a message, reply, or reaction event.",
        properties: {
          type: {
            type: GeminiStructuredResponseType.STRING,
            enum: [
              BottEventType.MESSAGE,
              BottEventType.REPLY,
              BottEventType.REACTION,
            ],
            description: "The type of event to generate.",
          },
          detail: {
            type: GeminiStructuredResponseType.OBJECT,
            description: "The specific detail for the generated event.",
            properties: {
              content: { type: GeminiStructuredResponseType.STRING },
            },
            required: ["content"],
          },
          parent: {
            type: GeminiStructuredResponseType.OBJECT,
            description:
              "A reference to the parent event this output is replying or reacting to. Required for `reply` and `reaction` event types.",
            properties: {
              id: {
                type: GeminiStructuredResponseType.STRING,
                description: "The unique ID of the parent event.",
              },
            },
            required: ["id"],
          },
        },
        required: ["type", "detail"],
      },
      ...getActionSchema(context.actions),
    ],
  },
});

export const getActionSchema = (
  actions: Record<string, BottAction>,
): GeminiStructuredResponseSchema[] => {
  if (Object.keys(actions).length === 0) {
    return [];
  }

  const schemas = [];

  for (const name in actions) {
    const action = actions[name];
    // Some handlers might not have options.

    schemas.push({
      type: GeminiStructuredResponseType.OBJECT,
      description: `Schema for the '${name}' action call event.`,
      properties: {
        type: {
          type: GeminiStructuredResponseType.STRING,
          enum: [BottActionEventType.ACTION_CALL],
        },
        detail: {
          type: GeminiStructuredResponseType.OBJECT,
          properties: {
            id: {
              type: GeminiStructuredResponseType.STRING,
            },
            name: {
              type: GeminiStructuredResponseType.STRING,
              enum: [name],
            },
            parameters: {
              type: GeminiStructuredResponseType.OBJECT,
              properties: (action.parameters ?? []).reduce(
                (properties, parameter) => {
                  let type: GeminiStructuredResponseType;

                  switch (parameter.type) {
                    case "number":
                      type = GeminiStructuredResponseType.NUMBER;
                      break;
                    case "boolean":
                      type = GeminiStructuredResponseType.BOOLEAN;
                      break;
                    case "string":
                      type = GeminiStructuredResponseType.STRING;
                      break;
                    default:
                      type = GeminiStructuredResponseType.STRING;
                      break;
                  }

                  properties[parameter.name] = {
                    type,
                    enum: parameter.type !== "file"
                      ? parameter.allowedValues?.map(String)
                      : undefined,
                    description: parameter.description,
                  };

                  return properties;
                },
                {} as Record<string, GeminiStructuredResponseSchema>,
              ),
              required: (action.parameters ?? []).filter((parameter) =>
                parameter.required
              ).map((parameter) => parameter.name),
            },
          },
          required: ["name", "parameters", "id"],
        },
      },
      required: ["type", "detail"],
    });
  }

  return schemas;
};
