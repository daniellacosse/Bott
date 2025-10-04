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

import { Handlebars } from "https://deno.land/x/handlebars/mod.ts";
import { type Schema, Type } from "npm:@google/genai";

import { BottEventRuleType } from "@bott/model";

import { CLASSIFIER_MODEL } from "../../../constants.ts";
import { queryGemini } from "../../utilities/queryGemini.ts";
import {
  reduceClassifiersForRuleType,
  reduceRulesForType,
} from "../../utilities/reduceRules.ts";
import type { EventPipelineProcessor } from "../types.ts";

import systemPromptTemplate from "./systemPrompt.md.hbs";

export const focusInput: EventPipelineProcessor = async (context) => {
  const input = structuredClone(context.data.input);

  const focusClassifiers = reduceClassifiersForRuleType(
    context.settings,
    BottEventRuleType.FOCUS_INPUT,
  );

  const systemPrompt = await new Handlebars().renderView(
    systemPromptTemplate,
    { focusClassifiers },
  );

  const responseSchema = {
    type: Type.OBJECT,
    properties: Object.keys(focusClassifiers).reduce(
      (properties, key) => {
        properties[key] = {
          type: Type.STRING,
          description: focusClassifiers[key].definition,
          enum: ["1", "2", "3", "4", "5"],
        };

        return properties;
      },
      {} as Record<string, Schema>,
    ),
    required: Object.keys(focusClassifiers),
  };

  const focusRules = reduceRulesForType(
    context.settings,
    BottEventRuleType.FOCUS_INPUT,
  );

  const geminiCalls: Promise<void>[] = [];

  let pointer = 0;
  while (pointer < input.length) {
    const event = input[pointer];

    if (event.details.scores) {
      continue;
    }

    geminiCalls.push((async () => {
      const scores = await queryGemini(
        // Provide the current event and all subsequent events as context for scoring.
        input.slice(pointer),
        systemPrompt,
        responseSchema,
        context,
        CLASSIFIER_MODEL,
      );

      event.details.scores = scores;
      event.details.focus = Object.values(focusRules).every((rule) =>
        rule.validator(event)
      );
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);

  context.data.input = input;

  return context;
};
