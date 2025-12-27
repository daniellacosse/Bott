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

import { APP_USER, GEMINI_RATING_MODEL } from "@bott/common";
import { BottEventType } from "@bott/system";
import { type Schema, Type } from "@google/genai";

import { generateFromEvents } from "../../../../generate/fromEvents/main.ts";
import type { EventPipelineProcessor } from "../types.ts";

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

export const focusInput: EventPipelineProcessor = async function () {
  const input = this.data.input;
  const inputReasons = this.action.service.settings.reasons.input;
  const inputRatingScales = [
    ...new Set(inputReasons.flatMap((reason) => reason.ratingScales ?? [])),
  ];

  // If we have no rating scales, just mark all events as focused.
  if (inputRatingScales.length === 0) {
    for (const event of input) {
      this.evaluationState.set(event.id, {
        focusReasons: Object.values(inputReasons)
          .filter((reason) => reason.validator()),
      });
    }
    return;
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: inputRatingScales.reduce(
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

    if (
      event.user?.id === this.action.user?.id || event.user?.id === APP_USER.id
    ) {
      pointer++;
      continue;
    }

    if (
      [
        BottEventType.ACTION_START,
        BottEventType.ACTION_OUTPUT,
        BottEventType.ACTION_COMPLETE,
        BottEventType.ACTION_ABORT,
      ].includes(event.type as BottEventType)
    ) {
      pointer++;
      continue;
    }

    geminiCalls.push((async () => {
      const currentPointer = pointer;
      const scoresWithRationale = await generateFromEvents<
        Record<string, { rating: string; rationale: string | undefined }>
      >(
        input.slice(0, currentPointer + 1),
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

      const triggeredFocusReasons = Object.values(inputReasons)
        .filter((reason) => reason.validator({ ratings }));

      this.evaluationState.set(event.id, {
        evaluationTime: new Date(),
        ratings,
        focusReasons: triggeredFocusReasons,
      });
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);
};
