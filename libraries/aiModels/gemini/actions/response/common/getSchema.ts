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
import { ACTION_RESPONSE_NAME } from "@bott/constants";
import {
  type BottEventActionParameterDefinition,
  BottEventType,
} from "@bott/events";
import type { BottServiceSettings } from "@bott/services";
import {
  type Schema as GeminiStructuredResponseSchema,
  Type as GeminiStructuredResponseType,
} from "@google/genai";

export const getEventSchema = (
  settings: BottServiceSettings,
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
      ...getActionSchema(settings.actions ?? {}),
      {
        type: GeminiStructuredResponseType.OBJECT,
        description:
          "Schema for aborting a previously started action. Send this event to cancel an action that is no longer needed (e.g., when starting a new action that supersedes a previous one).",
        properties: {
          type: {
            type: GeminiStructuredResponseType.STRING,
            enum: [BottEventType.ACTION_ABORT],
          },
          detail: {
            type: GeminiStructuredResponseType.OBJECT,
            properties: {
              id: {
                type: GeminiStructuredResponseType.STRING,
                description:
                  "The unique ID of the action call you want to abort.",
              },
            },
            required: ["id"],
          },
        },
        required: ["type", "detail"],
      },
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
    // Don't include the response action: we are already calling it
    if (name === ACTION_RESPONSE_NAME) {
      continue;
    }

    const action = actions[name];

    const schema: GeminiStructuredResponseSchema = {
      type: GeminiStructuredResponseType.OBJECT,
      description: `Schema for a call to the '${name}' action.`,
      properties: {
        type: {
          type: GeminiStructuredResponseType.STRING,
          enum: [BottEventType.ACTION_CALL],
        },
        detail: {
          type: GeminiStructuredResponseType.OBJECT,
          description: "The specifics of the action call you're making.",
          properties: {
            name: {
              type: GeminiStructuredResponseType.STRING,
              enum: [name],
            },
          },
          required: ["name"],
        },
      },
      required: ["type", "detail"],
    };

    if (action.parameters?.length) {
      schema.properties!.detail!.properties!.parameters =
        getActionParametersSchema(action.parameters);
    }

    schemas.push(schema);
  }

  return schemas;
};

const getActionParametersSchema = (
  parameters: BottEventActionParameterDefinition[],
): GeminiStructuredResponseSchema => {
  const properties: Record<string, GeminiStructuredResponseSchema> = {};
  const required: string[] = [];

  for (const parameter of parameters) {
    let type: GeminiStructuredResponseType;

    switch (parameter.type) {
      case "number":
        type = GeminiStructuredResponseType.NUMBER;
        break;
      case "boolean":
        type = GeminiStructuredResponseType.BOOLEAN;
        break;
      case "string":
      default:
        type = GeminiStructuredResponseType.STRING;
        break;
    }

    properties[parameter.name] = {
      type,
      enum: parameter.type !== "file"
        ? parameter.allowedValues?.map(String)
        : undefined,
      description: parameter.type === "file"
        ? parameter.description +
        " IMPORTANT: This is a 'file' parameter. You must send an attachment ID as the string. The system will automatically resolve the attachment by its ID."
        : parameter.description,
    };

    if (parameter.required && !parameter.defaultValue) {
      required.push(parameter.name);
    }
  }

  return {
    type: GeminiStructuredResponseType.OBJECT,
    properties,
    required: required.length ? required : undefined,
  };
};
