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

import { RATING_MODEL } from "../../../constants.ts";
import { queryGemini } from "../../utilities/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

export const focusInput: EventPipelineProcessor = async (context) => {
  const input = structuredClone(context.data.input);

  const inputReasons = context.settings.reasons.input;
  const inputRatingScales = inputReasons.flatMap((reason) =>
    reason.ratingScales ?? []
  );

  // If we have no way to determine focus, skip this step.
  if (inputRatingScales.length === 0) {
    return context;
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: inputRatingScales.reduce(
      (properties, ratingScale) => {
        properties[ratingScale.name] = {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.STRING,
              description: ratingScale.definition,
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
    required: inputRatingScales.map((ratingScale) => ratingScale.name),
  };

  const geminiCalls: Promise<void>[] = [];

  let pointer = 0;
  while (pointer < input.length) {
    const event = input[pointer];

    if (event.lastProcessedAt) {
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
          model: RATING_MODEL,
          useIdentity: false,
        },
      );

      const ratings: Record<string, number> = {};
      let logMessage = `Event ${event.id}:\n`;
      for (const ratingScale in scoresWithRationale) {
        const { score, rationale } = scoresWithRationale[ratingScale];
        if (rationale) {
          logMessage += `  ${ratingScale}: ${score}. Rationale: ${rationale}\n`;
        }

        ratings[ratingScale] = Number(score);
      }

      const metadata = { ratings };
      const triggeredReasons = Object.values(inputReasons)
        .filter((reason) => reason.validator(metadata))
        .map((reason) => reason.name);
      const shouldFocus = triggeredReasons.length > 0;

      context.evaluationState.set(event, {
        ratings,
        shouldFocus,
        triggeredReasons,
      });

      log.debug(
        logMessage + "    Marked for focus: " + shouldFocus +
          (shouldFocus ? ` (Reasons: ${triggeredReasons.join(", ")})` : ""),
      );
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);

  context.data.input = input;

  return context;
};
