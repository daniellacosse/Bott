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

export const focusInput: EventPipelineProcessor = async (context) => {
  const input = structuredClone(context.data.input);

  const inputReasons = context.settings.reasons.input;
  const inputClassifiers = inputReasons.flatMap((reason) =>
    reason.classifiers ?? []
  );

  // If we have no way to determine focus, skip this step.
  if (inputClassifiers.length === 0) {
    return context;
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: inputClassifiers.reduce(
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
    required: inputClassifiers.map((classifier) => classifier.name),
  };

  const geminiCalls: Promise<void>[] = [];

  let pointer = 0;
  while (pointer < input.length) {
    const event = input[pointer];

    if (event.details.scores) {
      pointer++;
      continue;
    }

    if (event.user?.id === context.user.id) {
      pointer++;
      continue;
    }

    geminiCalls.push((async () => {
      const scoresWithRationale = await queryGemini<
        Record<string, { score: string; rationale: string | undefined }>
      >(
        // Provide the current event and all subsequent events as context for scoring.
        input.slice(pointer),
        {
          systemPrompt,
          responseSchema,
          context,
          model: CLASSIFIER_MODEL,
          useIdentity: false,
        },
      );

      const scores: Record<string, number> = {};
      let logMessage = `Event ${event.id}:\n`;
      for (const classifier in scoresWithRationale) {
        const { score, rationale } = scoresWithRationale[classifier];
        if (rationale) {
          logMessage += `  ${classifier}: ${score}. Rationale: ${rationale}\n`;
        }

        scores[classifier] = Number(score);
      }

      event.details.scores = scores;
      event.details.focus = Object.values(inputReasons).some((reason) =>
        reason.validator(event)
      );

      log.debug(logMessage + "    Marked for focus: " + event.details.focus);
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);

  context.data.input = input;

  return context;
};
