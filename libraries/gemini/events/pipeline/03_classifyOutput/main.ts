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

import Handlebars from "handlebars";
import { type Schema, Type } from "@google/genai";

import { BottEventRuleType } from "@bott/model";
import { log } from "@bott/logger";

import { CLASSIFIER_MODEL } from "../../../constants.ts";
import { queryGemini } from "../../utilities/queryGemini.ts";
import {
  reduceClassifiersForRuleType,
  reduceRulesForType,
} from "../../utilities/reduceRules.ts";
import type { EventPipelineProcessor } from "../types.ts";

import systemPromptTemplate from "./systemPrompt.md.hbs" with { type: "text" };

export const classifyOutput: EventPipelineProcessor = async (context) => {
  if (!context.data.output.length) {
    return context;
  }

  const output = structuredClone(context.data.output);

  const filterClassifiers = reduceClassifiersForRuleType(
    context.settings,
    BottEventRuleType.FILTER_OUTPUT,
  );

  if (!filterClassifiers.length) {
    return context;
  }

  const systemPrompt = Handlebars.compile(
    systemPromptTemplate,
  )({ filterClassifiers });

  const responseSchema = {
    type: Type.OBJECT,
    properties: Object.keys(filterClassifiers).reduce(
      (properties, key) => {
        properties[key] = {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.STRING,
              description: filterClassifiers[key].definition,
              enum: ["1", "2", "3", "4", "5"],
            },
            rationale: {
              type: Type.STRING,
              description: "A 1-2 sentence rationale for the score given.",
            },
          },
          required: ["score"],
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
      const scoresWithRationale = await queryGemini<
        Record<string, { score: string; rationale: string | undefined }>
      >(
        // Provide the current event and all subsequent events as context for scoring.
        output.slice(pointer),
        systemPrompt,
        responseSchema,
        context,
        CLASSIFIER_MODEL,
      );

      const scores: Record<string, number> = {};

      for (const classifier in scoresWithRationale) {
        const { score, rationale } = scoresWithRationale[classifier];
        if (rationale) {
          log.debug(`${classifier}: ${score}. Rationale: ${rationale}`);
        }

        scores[classifier] = Number(score);
      }

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
