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

import { log } from "@bott/log";
import { BottEventType } from "@bott/model";
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
  const outputReasons = this.action.service.app.response.reasons.output;
  const outputRatingScales = [
    ...new Set(outputReasons.flatMap((reason) => reason.ratingScales ?? [])),
  ];

  if (!outputRatingScales.length) {
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

    geminiCalls.push((async () => {
      const scoresWithRationale = await queryGemini<
        Record<string, { rating: string; rationale: string | undefined }>
      >(
        // Provide the current event and all subsequent events as context for scoring.
        output.slice(pointer),
        {
          systemPrompt,
          responseSchema,
          pipeline: this,
          model: GEMINI_RATING_MODEL,
          useIdentity: false,
        },
      );

      const ratings: Record<string, number> = {};
      let logMessage = `Message Candidate:\n`;

      logMessage += `  Content: ${event.detail?.content ?? "n/a"}\n`;
      logMessage += `  Name: ${event.detail?.name ?? "n/a"}\n`;

      for (const ratingScale in scoresWithRationale) {
        const { rating, rationale } = scoresWithRationale[ratingScale];
        if (rationale) {
          logMessage +=
            `    ${ratingScale}: ${rating}. Rationale: ${rationale}\n`;
        }

        ratings[ratingScale] = Number(rating);
      }

      const metadata = { ratings };
      const triggeredOutputReasons = Object.values(outputReasons)
        .filter((reason) => reason.validator(metadata));

      this.evaluationState.set(event, {
        ratings,
        outputReasons: triggeredOutputReasons,
      });

      log.debug(
        logMessage +
        (triggeredOutputReasons.length > 0
          ? `    [TRIGGERED OUTPUT REASONS]: ${triggeredOutputReasons.map(({ name }) => name).join(", ")
          }`
          : ""),
      );
    })());

    pointer++;
  }

  await Promise.all(geminiCalls);

  this.data.output = output;

};
