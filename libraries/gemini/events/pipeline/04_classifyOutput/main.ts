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

export const classifyOutput: EventPipelineProcessor = async (context) => {
  const output = structuredClone(context.data.output);

  const filterClassifiers = reduceClassifiersForRuleType(
    context.settings,
    BottEventRuleType.FILTER_OUTPUT,
  );

  const systemPrompt = await new Handlebars().renderView(
    systemPromptTemplate,
    { filterClassifiers },
  );

  const responseSchema = {
    type: Type.OBJECT,
    properties: Object.keys(filterClassifiers).reduce(
      (properties, key) => {
        properties[key] = {
          type: Type.STRING,
          description: filterClassifiers[key].definition,
          enum: ["1", "2", "3", "4", "5"],
        };

        return properties;
      },
      {} as Record<string, Schema>,
    ),
    required: Object.keys(filterClassifiers),
  };

  const filterRules = reduceRulesForType(
    context.settings,
    BottEventRuleType.FILTER_OUTPUT,
  );

  const geminiCalls: Promise<void>[] = [];

  let pointer = 0;
  while (pointer < output.length) {
    const event = output[pointer];

    if (event.details.scores) {
      continue;
    }

    geminiCalls.push((async () => {
      const scores = await queryGemini(
        // Provide the current event and all subsequent events as context for scoring.
        output.slice(pointer),
        systemPrompt,
        responseSchema,
        context,
        CLASSIFIER_MODEL,
      );

      event.details.scores = scores;
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);

  context.data.output = output.filter((event) =>
    Object.values(filterRules).every((rule) => rule.validator(event))
  );

  return context;
};
