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

import { log } from "@bott/logger";

import { CLASSIFIER_MODEL } from "../../../constants.ts";
import { queryGemini } from "../../utilities/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

export const filterOutput: EventPipelineProcessor = async (context) => {
  if (!context.data.output.length) {
    return context;
  }

  const output = structuredClone(context.data.output);
  const outputReasons = context.settings.reasons.output;
  const outputClassifiers = outputReasons.flatMap((reason) =>
    reason.classifiers ?? []
  );

  if (!outputClassifiers.length) {
    return context;
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: outputClassifiers.reduce(
      (properties, classifier) => {
        properties[classifier.name] = {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.STRING,
              description: classifier.definition,
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
    required: outputClassifiers.map((classifier) => classifier.name),
  };

  const geminiCalls: Promise<void>[] = [];

  let pointer = 0;
  while (pointer < output.length) {
    const event = output[pointer];

    if (event.details.scores) {
      pointer++;
      continue;
    }

    geminiCalls.push((async () => {
      const scoresWithRationale = await queryGemini<
        Record<string, { score: string; rationale: string | undefined }>
      >(
        // Provide the current event and all subsequent events as context for scoring.
        output.slice(pointer),
        {
          systemPrompt,
          responseSchema,
          context,
          model: CLASSIFIER_MODEL,
          useIdentity: false,
        },
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
      event.details.filter = !Object.values(outputReasons).some((reason) =>
        reason.validator(event)
      );
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);

  context.data.output = output;

  return context;
};
