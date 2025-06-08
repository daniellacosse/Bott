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

import type { Content, Part } from "npm:@google/genai";
import { encodeBase64 } from "jsr:@std/encoding/base64";

import {
  type AnyBottEvent,
  type BottChannel,
  type BottEvent,
  BottEventType,
  type BottUser,
} from "@bott/model";

import { getEvents } from "@bott/storage";

import {
  CONFIG_ASSESSMENT_SCORE_THRESHOLD,
  INPUT_EVENT_LIMIT,
  INPUT_FILE_TOKEN_LIMIT,
} from "../constants.ts";
import { assessResponse, generateResponse } from "./instructions.ts";
import { outputGenerator, outputSchema } from "./output.ts";
import gemini from "../client.ts";

type GeminiResponseContext = {
  abortSignal: AbortSignal;
  context: {
    identity: string;
    user: BottUser;
    channel: BottChannel;
  };
  model?: string;
};

export async function* respondEvents(
  inputEvents: AnyBottEvent[],
  { model = "gemini-2.5-flash-preview-05-20", abortSignal, context }:
    GeminiResponseContext,
): AsyncGenerator<
  BottEvent<
    { content: string }
  >
> {
  const modelUserId = context.user.id;

  const contents: Content[] = [];
  let pointer = inputEvents.length;
  let goingOverSeenEvents = false;

  // Accumulates relevant history for assessing quality of messages later.
  const assessmentHistory = [];

  // We only want the model to respond to the most recent user messages,
  // since the model's last response:
  let estimatedTokens = 0;
  while (pointer--) {
    const event = {
      ...inputEvents[pointer],
      details: { ...inputEvents[pointer].details },
    };

    if (
      event.type === BottEventType.FUNCTION_REQUEST ||
      event.type === BottEventType.FUNCTION_RESPONSE
    ) {
      // Skip these events for now.
      continue;
    }

    // Determine if this event was from the model itself:
    if (event.user?.id === modelUserId) goingOverSeenEvents = true;

    // Prune old, stale assets that bloat the context window:
    if (
      goingOverSeenEvents && estimatedTokens > INPUT_FILE_TOKEN_LIMIT
    ) {
      delete event.files;
    } else {
      for (const asset of event.files ?? []) {
        estimatedTokens += asset.data.byteLength;
      }
    }

    // Remove parent assets from events that the model has already seen:
    if (event.parent) {
      delete event.parent.files;
    }

    const content = transformBottEventToContent({
      ...event,
      details: { ...event.details, seen: goingOverSeenEvents },
    } as BottEvent<object & { seen: boolean }>, modelUserId);

    if (!goingOverSeenEvents) {
      assessmentHistory.push(content);
    }

    contents.unshift(content);

    if (contents.length >= INPUT_EVENT_LIMIT) {
      break;
    }
  }

  if (contents.length === 0) {
    return;
  }

  const responseGenerator = await gemini.models.generateContentStream({
    model,
    contents,
    config: {
      abortSignal,
      candidateCount: 1,
      systemInstruction: {
        parts: [{ text: context.identity + generateResponse }],
      },
      responseMimeType: "application/json",
      responseSchema: outputSchema,
    },
  });

  for await (const event of outputGenerator(responseGenerator)) {
    const eventAssessmentContent = {
      role: "user",
      parts: [{ text: event.details.content }],
    };

    if (
      event.type !== BottEventType.REACTION
    ) {
      // Assess quality of the message:
      const assessmentResult = await gemini.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: [...assessmentHistory, eventAssessmentContent],
        config: {
          candidateCount: 1,
          systemInstruction: {
            parts: [{ text: assessResponse }],
          },
        },
      });

      const scoreText = assessmentResult.candidates?.[0]?.content?.parts?.[0]
        ?.text;

      if (scoreText) {
        const score = Number(scoreText.trim());

        if (!isNaN(score) && score < CONFIG_ASSESSMENT_SCORE_THRESHOLD) {
          console.debug(
            "[DEBUG] Message recieved poor assessment, skipping:",
            { content: event.details.content, score },
          );

          continue;
        }

        console.debug("[DEBUG] Message passed assessment:", {
          content: event.details.content,
          score,
        });
      }
    }

    assessmentHistory.push(eventAssessmentContent);

    yield {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event,
      user: context.user,
      channel: context.channel,
      parent: event.parent ? (await getEvents(event.parent.id))[0] : undefined,
    } as BottEvent<
      { content: string }
    >;
  }

  return;
}

const transformBottEventToContent = (
  event: BottEvent<object & { seen: boolean }>,
  modelUserId: string,
): Content => {
  const { files: assets, ...eventForStringify } = event;

  const parts: Part[] = [{ text: JSON.stringify(eventForStringify) }];

  const content: Content = {
    role: (event.user && event.user.id === modelUserId) ? "model" : "user",
    parts,
  };

  if (assets) {
    for (const asset of assets) {
      parts.push({
        inlineData: {
          mimeType: asset.type,
          data: encodeBase64(asset.data),
        },
      });
    }
  }
  return content;
};
