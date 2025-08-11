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
  type BottInputFile,
  BottInputFileType,
  type BottRequestEvent,
  type BottRequestHandler,
  type BottUser,
} from "@bott/model";
import type { getEvents } from "@bott/storage";

import gemini from "../client.ts";
import {
  CONFIG_ASSESSMENT_SCORE_THRESHOLD,
  INPUT_EVENT_LIMIT,
  INPUT_FILE_AUDIO_COUNT_LIMIT,
  INPUT_FILE_TOKEN_LIMIT,
  INPUT_FILE_VIDEO_COUNT_LIMIT,
  CONFIG_EVENTS_MODEL,
  CONFIG_ASSESSMENT_MODEL,
} from "../constants.ts";
import {
  getGenerateResponseInstructions,
  greetingAssessment,
  noveltyAssessment,
  requestRelatednessAssessment,
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
    model = CONFIG_EVENTS_MODEL,
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
  const resourceAccumulator = {
    estimatedTokens: 0,
    unseenEvents: 0,
    audioFiles: 0,
    videoFiles: 0,
  };
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

    // Remove unnecessary parent files from events:
    if (event.parent) {
      delete event.parent.files;
    }

    // Prune old, stale files that bloat the context window:
    if (event.files?.length) {
      const filesToKeep = [];
      for (const file of event.files) {
        let shouldPrune = false;

        if (
          resourceAccumulator.estimatedTokens + file.data.byteLength >
            INPUT_FILE_TOKEN_LIMIT
        ) {
          shouldPrune = true;
        } else if (
          file.type === BottInputFileType.OPUS &&
          resourceAccumulator.audioFiles >= INPUT_FILE_AUDIO_COUNT_LIMIT
        ) {
          shouldPrune = true;
        } else if (
          file.type === BottInputFileType.MP4 &&
          resourceAccumulator.videoFiles >= INPUT_FILE_VIDEO_COUNT_LIMIT
        ) {
          shouldPrune = true;
        }

        if (shouldPrune) {
          continue;
        }

        filesToKeep.push(file);

        if (file.type === BottInputFileType.OPUS) {
          resourceAccumulator.audioFiles++;
        } else if (file.type === BottInputFileType.MP4) {
          resourceAccumulator.videoFiles++;
        }

        resourceAccumulator.estimatedTokens += file.data.byteLength;
      }

      if (filesToKeep.length) {
        event.files = filesToKeep as BottInputFile[];
      } else {
        delete event.files;
      }
    }

    const content = _transformBottEventToContent({
      ...event,
      details: { ...event.details, seen: goingOverSeenEvents },
    } as BottEvent<object & { seen: boolean }>, modelUserId);

    if (!goingOverSeenEvents) {
      assessmentHistory.unshift(content);
      resourceAccumulator.unseenEvents++;
    }

    contents.unshift(content);

    if (contents.length >= INPUT_EVENT_LIMIT) {
      break;
    }
  }

  if (contents.length === 0) {
    return;
  }

  console.debug(
    `[DEBUG] Generating response to ${resourceAccumulator.unseenEvents} events, with ${resourceAccumulator.audioFiles} audio files and ${resourceAccumulator.videoFiles} video files...`,
  );

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
          eventAssessmentContent,
          ...assessmentHistory,
        ];

        // TODO (nit): Combine these into a single call.
        const scores = {
          greeting: await _performAssessment(
            assessmentContent,
            greetingAssessment,
          ),
          requestFulfillment: await _performAssessment(
            assessmentContent,
            requestRelatednessAssessment,
          ),
          novelty: await _performAssessment(
            assessmentContent,
            noveltyAssessment,
          ),
        };

        const score = Math.max(
          ...Object.values(scores),
        );

        if (score < CONFIG_ASSESSMENT_SCORE_THRESHOLD) {
          console.debug(
            "[DEBUG] Message recieved poor assessment, skipping:",
            { content: event.details.content, scores },
          );

          continue;
        }

        console.debug("[DEBUG] Message passed assessment:", {
          content: event.details.content,
          scores,
        });
      }

      assessmentHistory.unshift(eventAssessmentContent);
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
    model: CONFIG_ASSESSMENT_MODEL,
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
