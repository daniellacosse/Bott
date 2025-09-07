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
  BottEventType,
  type BottRequestHandler,
  BottRequestOptionType,
  type BottTrait,
} from "@bott/model";
import type { GeminiEventGenerationContext } from "./types.ts";

import {
  type Schema as GeminiStructuredResponseSchema,
  Type as GeminiStructuredResponseType,
} from "npm:@google/genai";

// TODO: robust event schema with property descriptions

export const getResponseSchema = <O extends AnyShape>({
  inputTraits,
  outputTraits,
  requestHandlers,
}: GeminiEventGenerationContext<O>) => ({
  type: GeminiStructuredResponseType.OBJECT,
  properties: {
    scoredInputEvents: {
      type: GeminiStructuredResponseType.ARRAY,
      items: {
        type: GeminiStructuredResponseType.OBJECT,
        properties: {
          id: { type: GeminiStructuredResponseType.STRING },
          type: { type: GeminiStructuredResponseType.STRING },
          details: {
            type: GeminiStructuredResponseType.OBJECT,
            properties: {
              content: { type: GeminiStructuredResponseType.STRING },
              scores: generateTraitScoringSchema(inputTraits),
            },
          },
        },
      },
    },
    outputEvents: {
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
          },
          details: {
            type: GeminiStructuredResponseType.OBJECT,
            oneOf: [
              {
                properties: {
                  content: {
                    type: GeminiStructuredResponseType.STRING,
                  },
                  scores: generateTraitScoringSchema(outputTraits),
                },
                required: ["content", "scores"],
              },
              generateRequestHandlerSchema<O>(requestHandlers),
            ],
          },
          parent: {
            type: GeminiStructuredResponseType.OBJECT,
            properties: {
              id: {
                type: GeminiStructuredResponseType.STRING,
              },
            },
            required: ["id"],
          },
        },
        required: ["type", "details"],
      },
    },
    outputScores: generateTraitScoringSchema(outputTraits),
  },
  required: ["inputEventScores", "outputEvents", "outputScores"],
});

const generateTraitScoringSchema = (traits: Record<string, BottTrait>) => {
  if (Object.keys(traits).length === 0) {
    return;
  }

  return {
    type: GeminiStructuredResponseType.OBJECT,
    properties: Object.values(traits).reduce(
      (properties, { name, description: baseDescription, examples }) => {
        let description = baseDescription
          ? baseDescription
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
            type: GeminiStructuredResponseType.NUMBER,
            enum: ["1", "2", "3", "4", "5"],
            description,
          },
        };
      },
      {} as Record<string, GeminiStructuredResponseSchema>,
    ),
    required: Object.keys(traits),
  };
};

const generateRequestHandlerSchema = <O extends AnyShape>(
  handlers: Record<string, BottRequestHandler<O, AnyShape>>,
) => {
  if (Object.keys(handlers).length === 0) {
    return;
  }

  let options;

  if (
    Object.values(handlers).some((handler: BottRequestHandler<O, AnyShape>) =>
      "options" in handler
    )
  ) {
    const oneOf = [];

    for (const { options } of Object.values(handlers)) {
      if (!options) {
        continue;
      }

      oneOf.push({
        properties: options.reduce((properties, option) => {
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
      },
      options,
      required: ["name"],
    },
  };
};
