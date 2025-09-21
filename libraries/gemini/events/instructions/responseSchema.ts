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
  type BottAction,
  BottActionOptionType,
  type BottChannel,
  type BottEventClassifier,
  BottEventRuleType,
  BottEventType,
  type BottGlobalSettings,
  type BottUser,
} from "@bott/model";

import {
  type Schema as GeminiStructuredResponseSchema,
  Type as GeminiStructuredResponseType,
} from "npm:@google/genai";
import { reduceClassifiersForRuleType } from "./reduce.ts";

export const getResponseSchema = <O extends AnyShape>(
  context: {
    user: BottUser;
    channel: BottChannel;
    actions: Record<string, BottAction<O, AnyShape>>;
    settings: BottGlobalSettings;
  },
) => ({
  type: GeminiStructuredResponseType.OBJECT,
  description:
    "The root object for the entire response, containing scored inputs, generated outputs, and overall output scores.",
  properties: {
    inputEventScores: {
      type: GeminiStructuredResponseType.ARRAY,
      description:
        "An array containing only the input events you scored, now with a 'scores' object added to each.",
      items: {
        type: GeminiStructuredResponseType.OBJECT,
        properties: {
          id: {
            type: GeminiStructuredResponseType.STRING,
            description: "The unique identifier of the input event.",
          },
          type: {
            type: GeminiStructuredResponseType.STRING,
            description: "The type of the event (e.g., `message`).",
          },
          user: {
            type: GeminiStructuredResponseType.OBJECT,
            description: "The user who created the event.",
            properties: {
              id: { type: GeminiStructuredResponseType.STRING },
              name: { type: GeminiStructuredResponseType.STRING },
            },
          },
          details: {
            type: GeminiStructuredResponseType.OBJECT,
            description:
              "Contains the event content and the scores you've assigned.",
            properties: {
              content: {
                type: GeminiStructuredResponseType.STRING,
                description: "The textual content of the message.",
              },
              scores: getEventClassifierSchema(reduceClassifiersForRuleType(
                context.settings,
                BottEventRuleType.FILTER_INPUT,
              )),
            },
          },
        },
        required: ["id", "type", "details"],
      },
    },
    outputEvents: {
      type: GeminiStructuredResponseType.ARRAY,
      description:
        "The final array of events you have generated and approved for response to the input.",
      items: {
        type: GeminiStructuredResponseType.OBJECT,
        properties: {
          type: {
            type: GeminiStructuredResponseType.STRING,
            enum: [
              BottEventType.MESSAGE,
              BottEventType.REPLY,
              BottEventType.REACTION,
              BottEventType.ACTION_CALL,
            ],
            description: "The type of event to generate.",
          },
          details: {
            type: GeminiStructuredResponseType.OBJECT,
            description: "The specific details for the generated event.",
            oneOf: [
              {
                properties: {
                  content: {
                    type: GeminiStructuredResponseType.STRING,
                  },
                  scores: getEventClassifierSchema(
                    reduceClassifiersForRuleType(
                      context.settings,
                      BottEventRuleType.FILTER_OUTPUT,
                    ),
                  ),
                },
                required: ["content", "scores"],
              },
              getActionSchema<O>(context.actions),
            ],
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
        required: ["type", "details"],
      },
    },
    outputScores: getEventClassifierSchema(
      reduceClassifiersForRuleType(
        context.settings,
        BottEventRuleType.FILTER_OUTPUT,
      ),
    ),
  },
  required: ["inputEventScores", "outputEvents"],
});

const getEventClassifierSchema = (
  classifiers: Record<string, BottEventClassifier>,
) => {
  if (Object.keys(classifiers).length === 0) {
    return;
  }

  return {
    type: GeminiStructuredResponseType.OBJECT,
    description:
      "A collection of scores for various traits, evaluating a message or response.",
    properties: Object.values(classifiers).reduce(
      (properties, { name, definition, examples }) => {
        let description = definition
          ? definition
          : `How much this message pertains to "${name}".`;

        description += `\n\nExample Scores:\n${
          Object.entries(examples).flatMap(
            ([value, examples]) =>
              examples.map((example) => `${example} => Score: ${value}`),
          )
        }`;

        return {
          ...properties,
          [name]: {
            type: GeminiStructuredResponseType.OBJECT,
            description,
            properties: {
              score: {
                type: GeminiStructuredResponseType.NUMBER,
                description: "The numeric score from 1 to 5.",
                enum: ["1", "2", "3", "4", "5"],
              },
              rationale: {
                type: GeminiStructuredResponseType.STRING,
                description:
                  "A brief, one-sentence justification for the assigned score.",
              },
            },
            required: ["score"],
          },
        };
      },
      {} as Record<string, GeminiStructuredResponseSchema>,
    ),
    required: Object.keys(classifiers),
  };
};

const getActionSchema = <O extends AnyShape>(
  handlers: Record<string, BottAction<O, AnyShape>>,
) => {
  if (Object.keys(handlers).length === 0) {
    return;
  }

  let options;

  if (
    Object.values(handlers).some((handler: BottAction<O, AnyShape>) =>
      "options" in handler
    )
  ) {
    const oneOf = [];

    for (const { options } of Object.values(handlers)) {
      // Some handlers might not have options.
      if (!options) {
        continue;
      }

      oneOf.push({
        properties: options.reduce((properties, option) => {
          let type: GeminiStructuredResponseType;

          switch (option.type) {
            case BottActionOptionType.INTEGER:
              type = GeminiStructuredResponseType.NUMBER;
              break;
            case BottActionOptionType.BOOLEAN:
              type = GeminiStructuredResponseType.BOOLEAN;
              break;
            case BottActionOptionType.STRING:
            default:
              type = GeminiStructuredResponseType.STRING;
              break;
          }

          properties[option.name] = {
            type,
            enum: option.allowedValues,
            description: option.description,
          };

          return properties;
        }, {} as Record<string, GeminiStructuredResponseSchema>),
        required: options.filter((option) => option.required).map(
          (option) => option.name,
        ),
      });
    }

    options = {
      type: GeminiStructuredResponseType.OBJECT,
      oneOf,
    };
  }

  return {
    properties: {
      name: {
        type: GeminiStructuredResponseType.STRING,
        enum: Object.keys(handlers),
        description: "The name of the request function to call.",
      },
      options,
    },
    required: ["name"],
  };
};
