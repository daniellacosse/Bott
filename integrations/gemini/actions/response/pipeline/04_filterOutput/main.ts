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

import { GEMINI_RATING_MODEL } from "@bott/common";

import { BottEventType } from "@bott/system";
import { type Schema, Type } from "@google/genai";
import { generateFromEvents } from "../../../../generate/fromEvents/main.ts";
import type { EventPipelineProcessor } from "../types.ts";

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

export const filterOutput: EventPipelineProcessor = async function () {
  if (!this.data.output.length) {
    return;
  }

  const output = this.data.output;
  const outputReasons = this.action.service.settings.reasons.output;
  const outputRatingScales = [
    ...new Set(outputReasons.flatMap((reason) => reason.ratingScales ?? [])),
  ];

  // If we have no rating scales, just mark all events as focused.
  if (outputRatingScales.length === 0) {
    for (const event of output) {
      this.evaluationState.set(event.id, {
        outputReasons: Object.values(outputReasons)
          .filter((reason) => reason.validator()),
      });
    }
    return;
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: outputRatingScales.reduce(
      (properties, ratingScale) => {
        properties[ratingScale.name] = {
          type: Type.OBJECT,
          properties: {
            rating: {
              type: Type.STRING,
              description: ratingScale.definition,
              enum: ["1", "2", "3", "4", "5"],
            },
            rationale: {
              type: Type.STRING,
              description: "A 1-2 sentence rationale for the rating given.",
            },
          },
          required: ["rating"],
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

    const currentPointer = pointer;
    geminiCalls.push((async () => {
      // combine input and output slice
      const contents = [
        ...this.data.input,
        ...output.slice(0, currentPointer + 1),
      ];

      const scoresWithRationale = await generateFromEvents<
        Record<string, { rating: string; rationale: string | undefined }>
      >(
        contents,
        {
          systemPrompt,
          responseSchema,
          pipeline: this,
          model: GEMINI_RATING_MODEL,
          useThirdPersonAnalysis: true,
        },
      );

      const ratings: Record<string, number> = {};
      if (scoresWithRationale) {
        for (const ratingScale in scoresWithRationale) {
          const { rating } = scoresWithRationale[ratingScale];

          ratings[ratingScale] = Number(rating);
        }
      }

      const triggeredOutputReasons = Object.values(outputReasons)
        .filter((reason) => reason.validator({ ratings }));

      this.evaluationState.set(event.id, {
        evaluationTime: new Date(),
        ratings,
        outputReasons: triggeredOutputReasons,
      });
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);
};
