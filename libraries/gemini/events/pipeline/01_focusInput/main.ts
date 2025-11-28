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

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

export const focusInput: EventPipelineProcessor = async (context) => {
  const input = structuredClone(context.data.input);

  const focusClassifiers = reduceClassifiersForRuleType(
    context.settings,
    BottEventRuleType.FOCUS_REASON,
  );

  // If we have no way to determine focus, skip this step.
  if (Object.keys(focusClassifiers).length === 0) {
    return context;
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: Object.keys(focusClassifiers).reduce(
      (properties, key) => {
        properties[key] = {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.STRING,
              description: focusClassifiers[key].definition,
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
    required: Object.keys(focusClassifiers),
  };

  const focusRules = reduceRulesForType(
    context.settings,
    BottEventRuleType.FOCUS_REASON,
  );

  const geminiCalls: Promise<void>[] = [];

  let pointer = 0;
  while (pointer < input.length) {
    const event = input[pointer];

    if (event.details.scores) {
      continue;
    }

    geminiCalls.push((async () => {
      const scoresWithRationale = await queryGemini<
        Record<string, { score: string; rationale: string | undefined }>
      >(
        // Provide the current event and all subsequent events as context for scoring.
        input.slice(pointer),
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
      event.details.focus = Object.values(focusRules).some((rule) =>
        rule.validator(event)
      );
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);

  context.data.input = input;

  return context;
};
