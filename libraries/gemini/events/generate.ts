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
  type AnyShape,
  type BottChannel,
  type BottEvent,
  BottEventType,
  type BottRequestEvent,
  type BottRequestHandler,
  type BottUser,
} from "@bott/model";
import type { getEvents } from "@bott/storage";

import gemini from "../client.ts";
import {
  CONFIG_ASSESSMENT_SCORE_THRESHOLD,
  INPUT_EVENT_LIMIT,
  INPUT_FILE_TOKEN_LIMIT,
} from "../constants.ts";
import {
  getGenerateResponseInstructions,
  greetingAssessment,
  noveltyAssessment,
  requestFulfillmentAssessment,
} from "./instructions.ts";
import { getOutputEventSchema, outputEventStream } from "./output.ts";

type GeminiResponseContext<O extends AnyShape> = {
  abortSignal: AbortSignal;
  context: {
    identity: string;
    user: BottUser;
    channel: BottChannel;
  };
  getEvents: typeof getEvents;
  model?: string;
  requestHandlers?: BottRequestHandler<O, AnyShape>[];
};

export async function* generateEvents<O extends AnyShape>(
  inputEvents: AnyBottEvent[],
  {
    model = "gemini-2.5-flash-preview-05-20",
    abortSignal,
    context,
    getEvents,
    requestHandlers,
  }: GeminiResponseContext<O>,
): AsyncGenerator<
  | BottEvent
  | BottRequestEvent<O>
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
      event.type === BottEventType.REQUEST ||
      event.type === BottEventType.RESPONSE
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

    const content = _transformBottEventToContent({
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
        parts: [{
          text: getGenerateResponseInstructions<O>(requestHandlers ?? []),
        }],
      },
      responseMimeType: "application/json",
      responseSchema: getOutputEventSchema<O>(requestHandlers ?? []),
    },
  });

  for await (const event of outputEventStream(responseGenerator)) {
    if (
      "content" in event.details
    ) {
      const eventAssessmentContent = {
        role: "user",
        parts: [{ text: event.details.content }],
      };

      if (
        event.type !== BottEventType.REACTION &&
        event.type !== BottEventType.REQUEST
      ) {
        const assessmentContent = [
          ...assessmentHistory,
          eventAssessmentContent,
        ];

        // TODO (nit): Combine these into a single call.
        const score = Math.max(
          await _performAssessment(
            assessmentContent,
            greetingAssessment,
          ),
          await _performAssessment(
            assessmentContent,
            requestFulfillmentAssessment,
          ),
          await _performAssessment(
            assessmentContent,
            noveltyAssessment,
          ),
        );

        if (score < CONFIG_ASSESSMENT_SCORE_THRESHOLD) {
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

      assessmentHistory.push(eventAssessmentContent);
    }

    const commonFields = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      user: context.user,
      channel: context.channel,
      parent: event.parent ? (await getEvents(event.parent.id))[0] : undefined,
    };

    if (event.type === BottEventType.REQUEST) {
      yield {
        ...commonFields,
        type: event.type,
        details: event.details as { name: string; options: O },
      };
    } else {
      yield {
        ...commonFields,
        type: event.type,
        details: event.details as { content: string },
      };
    }
  }

  return;
}

const _performAssessment = async (
  contents: Content[],
  assessmentInstructions: string,
): Promise<number> => {
  const assessmentResult = await gemini.models.generateContent({
    model: "gemini-2.0-flash-lite",
    contents,
    config: {
      candidateCount: 1,
      systemInstruction: {
        parts: [{ text: assessmentInstructions }],
      },
    },
  });

  const scoreText = assessmentResult.candidates?.[0]?.content?.parts?.[0]?.text;

  if (scoreText) {
    const score = Number(scoreText.trim());
    if (!isNaN(score)) {
      return score;
    }
  }

  // Return a default high score if assessment fails, to avoid blocking messages
  // due to assessment errors.
  return 100;
};

const _transformBottEventToContent = (
  event: BottEvent<object & { seen: boolean }>,
  modelUserId: string,
): Content => {
  // Explicitly construct the object to be stringified to avoid circular references,
  // (Especially from event.files[...].parent pointing back to the event itself.)
  const eventToSerialize: Record<string, unknown> = {
    id: event.id,
    type: event.type,
    details: event.details, // Assuming details are already JSON-serializable
    timestamp: event.timestamp,
    user: event.user ? { id: event.user.id, name: event.user.name } : undefined,
    channel: event.channel
      ? {
        id: event.channel.id,
        name: event.channel.name,
        description: event.channel.description,
        space: event.channel.space
          ? {
            id: event.channel.space.id,
            name: event.channel.space.name,
            description: event.channel.space.description,
          }
          : undefined,
      }
      : undefined,
  };

  if (event.parent) {
    // The caller (generateEvents) should have already handled event.parent.files.
    // We create a simplified parent reference here.
    const { files: _files, ...parentDetails } = event.parent;

    if (parentDetails.parent) {
      // This level of nesting in this context is unnecessary.
      delete parentDetails.parent;
    }

    eventToSerialize.parent = parentDetails;
  }

  const parts: Part[] = [{ text: JSON.stringify(eventToSerialize) }];
  const content: Content = {
    role: (event.user && event.user.id === modelUserId) ? "model" : "user",
    parts,
  };

  if (event.files) {
    for (const file of event.files) {
      parts.push({
        inlineData: {
          mimeType: file.type,
          data: encodeBase64(file.data),
        },
      });
    }
  }

  return content;
};
