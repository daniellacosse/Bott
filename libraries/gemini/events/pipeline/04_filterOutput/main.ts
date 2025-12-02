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
import { BottEventType } from "@bott/model";

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

export const filterOutput: EventPipelineProcessor = async (context) => {
  if (!context.data.output.length) {
    return context;
  }

  const output = structuredClone(context.data.output);
  const outputReasons = context.settings.reasons.output;
  const outputRatingScales = outputReasons.flatMap((reason) =>
    reason.ratingScales ?? []
  );

  if (!outputRatingScales.length) {
    return context;
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: outputRatingScales.reduce(
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
    required: outputRatingScales.map((ratingScale) => ratingScale.name),
  };

  const geminiCalls: Promise<void>[] = [];

  let pointer = 0;
  while (pointer < output.length) {
    const event = output[pointer];

    if (event.lastProcessedAt) {
      pointer++;
      continue;
    }

    // No need to filter reactions, really.
    if (event.type === BottEventType.REACTION) {
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
          model: RATING_MODEL,
          useIdentity: false,
        },
      );

      const ratings: Record<string, number> = {};
      let logMessage = `Message Candidate:\n`;

      logMessage += `  Content: ${event.details.content}\n`;
      logMessage += `  Name: ${event.details.name}\n`;

      for (const ratingScale in scoresWithRationale) {
        const { score, rationale } = scoresWithRationale[ratingScale];
        if (rationale) {
          logMessage +=
            `    ${ratingScale}: ${score}. Rationale: ${rationale}\n`;
        }

        ratings[ratingScale] = Number(score);
      }

      const metadata = { ratings };
      const triggeredReasons = Object.values(outputReasons)
        .filter((reason) => reason.validator(metadata))
        .map((reason) => reason.name);
      const shouldOutput = triggeredReasons.length > 0;

      context.evaluationState.set(event, {
        ratings,
        shouldOutput,
        triggeredReasons,
      });

      log.debug(
        logMessage + "      Marked for output: " + shouldOutput +
          (shouldOutput ? ` (Reasons: ${triggeredReasons.join(", ")})` : ""),
      );
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);

  context.data.output = output;

  return context;
};
