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
import type { AnyShape } from "@bott/model";
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

  // If we have no rating scales, just mark all events as focused.
  if (inputRatingScales.length === 0) {
    for (const event of input) {
      this.evaluationState.set(event, {
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
  const blurLogQueue: {
    id: string;
    type: string;
    detail: AnyShape;
    focus: false;
    ratings: Record<string, { rating: string; rationale: string | undefined }>;
  }[] = [];
  const focusLogQueue: {
    id: string;
    type: string;
    detail: AnyShape;
    focusReasons: string[];
    ratings: Record<string, { rating: string; rationale: string | undefined }>;
  }[] = [];

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

    const currentPointer = pointer;

    geminiCalls.push((async () => {
      const scoresWithRationale = await queryGemini<
        Record<string, { rating: string; rationale: string | undefined }>
      >(
        // Provide the history and current input events up to this point as context.
        [...input.slice(0, currentPointer + 1)],
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

      if (triggeredFocusReasons.length) {
        focusLogQueue.push({
          id: event.id,
          type: event.type,
          detail: event.detail,
          focusReasons: triggeredFocusReasons.map((reason) => reason.name),
          ratings: scoresWithRationale ?? {},
        });
      } else {
        blurLogQueue.push({
          id: event.id,
          type: event.type,
          detail: event.detail,
          focus: false,
          ratings: scoresWithRationale ?? {},
        });
      }
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);

  console.debug("focused", this.action.id, focusLogQueue);
  console.debug("blurred", this.action.id, blurLogQueue);
};
