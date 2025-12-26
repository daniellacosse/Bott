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

import { GEMINI_RATING_MODEL } from "@bott/constants";

import { BottEventType } from "@bott/events";
import type { AnyShape } from "@bott/model";
import { type Schema, Type } from "@google/genai";
import { queryGemini } from "../../common/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

export const filterOutput: EventPipelineProcessor = async function () {
  if (!this.data.output.length) {
    return;
  }

  const output = this.data.output;
  const outputReasons = this.action.service.app.reasons.output;
  const outputRatingScales = [
    ...new Set(outputReasons.flatMap((reason) => reason.ratingScales ?? [])),
  ];

  // If we have no rating scales, just mark all events as focused.
  if (outputRatingScales.length === 0) {
    for (const event of output) {
      this.evaluationState.set(event, {
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
  const filteredLogQueue: {
    id: string;
    type: string;
    detail: AnyShape;
    output: false;
    ratings: Record<string, { rating: string; rationale: string | undefined }>;
  }[] = [];
  const outputLogQueue: {
    id: string;
    type: string;
    detail: AnyShape;
    outputReasons: string[];
    ratings: Record<string, { rating: string; rationale: string | undefined }>;
  }[] = [];

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
      outputLogQueue.push({
        id: event.id,
        type: event.type,
        detail: event.detail,
        outputReasons: outputReasons.map((reason) => reason.name),
        ratings: {},
      });
      continue;
    }
    const currentPointer = pointer;
    geminiCalls.push((async () => {
      const scoresWithRationale = await queryGemini<
        Record<string, { rating: string; rationale: string | undefined }>
      >(
        // Provide the current event and all subsequent events as context for scoring.
        [...this.data.input, ...output.slice(0, currentPointer + 1)],
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

      const triggeredOutputReasons = Object.values(outputReasons)
        .filter((reason) => reason.validator({ ratings }));

      this.evaluationState.set(event, {
        ratings,
        outputReasons: triggeredOutputReasons,
      });

      if (!triggeredOutputReasons.length) {
        filteredLogQueue.push({
          id: event.id,
          type: event.type,
          detail: event.detail,
          ratings: scoresWithRationale ?? {},
          output: false,
        });
      } else {
        outputLogQueue.push({
          id: event.id,
          type: event.type,
          detail: event.detail,
          outputReasons: triggeredOutputReasons.map((reason) => reason.name),
          ratings: scoresWithRationale ?? {},
        });
      }
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);

  console.debug("filtered", this.action.id, filteredLogQueue);
  console.debug("output", this.action.id, outputLogQueue);
};
