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

import { BottAttachmentType } from "@bott/model";
import type {
  BottAction,
  BottChannel,
  BottEvent,
  BottGlobalSettings,
  BottUser,
} from "@bott/model";
import { addEvents } from "@bott/storage";
import { log } from "@bott/logger";

import pipeline, { type EventPipelineContext } from "./pipeline/main.ts";

import { getEvents } from "@bott/storage";

import {
  INPUT_EVENT_COUNT_LIMIT,
  INPUT_EVENT_TIME_LIMIT_MS,
  INPUT_FILE_AUDIO_COUNT_LIMIT,
  INPUT_FILE_TOKEN_LIMIT,
  INPUT_FILE_VIDEO_COUNT_LIMIT,
} from "@bott/constants";

export async function* generateEvents(
  inputEvents: BottEvent[],
  context: {
    abortSignal: AbortSignal;
    user: BottUser;
    channel: BottChannel;
    actions: Record<string, BottAction>;
    settings: BottGlobalSettings;
  },
): AsyncGenerator<BottEvent> {
  const prunedInput: BottEvent[] = [];
  const now = Date.now();
  const timeCutoff = now - INPUT_EVENT_TIME_LIMIT_MS;

  const resourceAccumulator = {
    tokens: 0,
    audioFiles: 0,
    videoFiles: 0,
  };

  // Iterate backwards to prioritize the most recent events
  for (let i = inputEvents.length - 1; i >= 0; i--) {
    if (prunedInput.length >= INPUT_EVENT_COUNT_LIMIT) {
      break;
    }

    const event = structuredClone(inputEvents[i]);

    if (event.createdAt.getTime() < timeCutoff) {
      break;
    }

    if (event.attachments) {
      const attachmentsToKeep = [];
      for (const attachment of event.attachments) {
        if (!attachment.compressed?.file) continue;

        const newTotalTokens = resourceAccumulator.tokens +
          attachment.compressed.file.size;

        if (newTotalTokens > INPUT_FILE_TOKEN_LIMIT) continue;

        const isAudio =
          attachment.compressed.file.type === BottAttachmentType.MP3 ||
          attachment.compressed.file.type === BottAttachmentType.OPUS ||
          attachment.compressed.file.type === BottAttachmentType.WAV;

        if (
          isAudio &&
          resourceAccumulator.audioFiles >= INPUT_FILE_AUDIO_COUNT_LIMIT
        ) continue;

        const isVideo =
          attachment.compressed.file.type === BottAttachmentType.MP4;

        if (
          isVideo &&
          resourceAccumulator.videoFiles >= INPUT_FILE_VIDEO_COUNT_LIMIT
        ) continue;

        attachmentsToKeep.push(attachment);

        resourceAccumulator.tokens = newTotalTokens;
        if (isAudio) resourceAccumulator.audioFiles++;
        if (isVideo) resourceAccumulator.videoFiles++;
      }

      event.attachments = attachmentsToKeep.length > 0
        ? attachmentsToKeep
        : undefined;
    }

    prunedInput.unshift(event);
  }

  let pipelineContext: EventPipelineContext = {
    data: {
      input: prunedInput,
      output: [],
    },
    evaluationState: new Map(),
    ...context,
  };

  for (const processor of pipeline) {
    try {
      log.perf(processor.name);
      pipelineContext = await processor(pipelineContext);
      log.perf(processor.name);
    } catch (error) {
      log.error((error as Error).message, (error as Error).stack);
      break;
    }
  }

  try {
    const processingTime = new Date();

    await addEvents(
      ...pipelineContext.data.input.map((event) => ({
        ...event,
        lastProcessedAt: processingTime,
      })),
    );
  } catch (error) {
    log.warn(error);
  }

  for (const event of pipelineContext.data.output) {
    if (!pipelineContext.evaluationState.get(event)?.outputReasons?.length) {
      continue;
    }

    yield {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      user: context.user,
      channel: context.channel,
      // Gemini does not return the full parent event
      parent: event.parent ? (await getEvents(event.parent.id))[0] : undefined,
    };
  }

  return;
}
