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

import { APP_USER, GEMINI_RATING_MODEL } from "@bott/constants";

import { BottEventType } from "@bott/events";
import { log } from "@bott/log";
import { type Schema, Type } from "@google/genai";
import { queryGemini } from "../../common/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

export const focusInput: EventPipelineProcessor = async function () {
  const input = this.data.input;
  const inputReasons = this.action.service.app.reasons.input;
  const inputRatingScales = [
    ...new Set(inputReasons.flatMap((reason) => reason.ratingScales ?? [])),
  ];

  // If we have no way to determine focus, skip this step.
  if (inputRatingScales.length === 0) {
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
      ].includes(event.type)
    ) {
      pointer++;
      continue;
    }

    geminiCalls.push((async () => {
      const scoresWithRationale = await queryGemini<
        Record<string, { rating: string; rationale: string | undefined }>
      >(
        // Provide the current event and all subsequent events as context for scoring.
        input.slice(pointer),
        {
          systemPrompt,
          responseSchema,
          pipeline: this,
          model: GEMINI_RATING_MODEL,
          useIdentity: false,
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

      this.evaluationState.set(event, {
        ratings,
        focusReasons: triggeredFocusReasons,
      });

      event.lastProcessedAt = new Date();

      log.debug(event.id, scoresWithRationale, triggeredFocusReasons);
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);

  this.data.input = input;
};
