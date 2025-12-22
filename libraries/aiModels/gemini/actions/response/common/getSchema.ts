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
import { type BottEventActionParameter, BottEventType } from "@bott/events";
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

    const schema: GeminiStructuredResponseSchema = {
      type: GeminiStructuredResponseType.OBJECT,
      description:
        `Schema for a call event to the '${name}' action. Send this type of event to call the action.`,
      properties: {
        type: {
          type: GeminiStructuredResponseType.STRING,
          enum: [BottEventType.ACTION_CALL],
          description:
            `The type of event to generate, in this case '${BottEventType.ACTION_CALL}'. Required so the system can anticipate the event structure.`,
        },
        detail: {
          type: GeminiStructuredResponseType.OBJECT,
          description: "The specifics of the action call you're making.",
          properties: {
            name: {
              type: GeminiStructuredResponseType.STRING,
              enum: [name],
              description:
                "The name of this action. Required so the action can be identified.",
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
      schema.properties!.detail!.required!.push("parameters");
    }

    schemas.push(schema);
  }

  return schemas;
};

const getActionParametersSchema = (
  parameters: BottEventActionParameter[],
): GeminiStructuredResponseSchema => ({
  type: GeminiStructuredResponseType.ARRAY,
  items: {
    // We can't enforce all parameters, unfortunately.
    anyOf: parameters.map(
      (parameter) => {
        let valueType: GeminiStructuredResponseType;

        switch (parameter.type) {
          case "number":
            valueType = GeminiStructuredResponseType.NUMBER;
            break;
          case "boolean":
            valueType = GeminiStructuredResponseType.BOOLEAN;
            break;
          case "string":
          default:
            valueType = GeminiStructuredResponseType.STRING;
            break;
        }

        const schema: GeminiStructuredResponseSchema = {
          type: GeminiStructuredResponseType.OBJECT,
          properties: {
            name: {
              type: GeminiStructuredResponseType.STRING,
              enum: [parameter.name],
              description:
                "The name of this parameter. Required so the parameter can be identified.",
            },
            value: {
              type: valueType,
              enum: parameter.type !== "file"
                ? parameter.allowedValues?.map(String)
                : undefined,
              description:
                "The value of this parameter. In the case of 'file', provide the attachment ID you'd like to pass to the action. The system will resolve the file data for you.",
            },
            type: {
              type: GeminiStructuredResponseType.STRING,
              enum: [parameter.type],
              description:
                "The type of this parameter. Providing this here accellerates system performance.",
            },
          },
          description: parameter.description,
          required: parameter.required
            ? ["name", "value", "type"]
            : ["name", "value"],
        };

        return schema;
      },
    ),
  },
});
