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

import { createAction } from "@bott/actions";
import {
  INPUT_EVENT_COUNT_LIMIT,
  INPUT_EVENT_TIME_LIMIT_MS,
  INPUT_FILE_AUDIO_COUNT_LIMIT,
  INPUT_FILE_TOKEN_LIMIT,
  INPUT_FILE_VIDEO_COUNT_LIMIT,
  BOTT_SERVICE,
  TYPING_WORDS_PER_MINUTE,
  TYPING_MAX_TIME_MS,
} from "@bott/constants";
import { log } from "@bott/log";
import { BottAttachmentType, type BottAction, type BottGlobalSettings, isBottDataEvent } from "@bott/model";
import type {
  BottActionValue,
} from "@bott/model";
import { BottEvent } from "@bott/service";
import { addEvents, getEvents } from "@bott/storage";

import { delay } from "@std/async";

import pipeline, { type EventPipelineContext } from "./pipeline/main.ts";

// TODO: Replace with actual settings or move settings to a shared library
const BOTT_GLOBAL_SETTINGS: BottGlobalSettings = {
  identity: "",
  reasons: {
    input: [],
    output: [],
  },
};

const MS_IN_MINUTE = 60 * 1000;

export const responseAction: BottAction = createAction(async (input, _context) => {
  const inputEntries = input.filter((i) => i.name.startsWith("history"));
  const inputEvents = inputEntries
    .map((i) => i.value)
    .filter(isBottDataEvent);

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

  // Derive context from history
  const latestEvent = inputEvents[inputEvents.length - 1]; // Assuming ascending order input
  const channel = latestEvent?.channel;

  // Use bot user as the actor
  const user = BOTT_SERVICE.user;

  if (!channel) {
    throw new Error("Could not derive channel from input history");
  }

  let pipelineContext: EventPipelineContext = {
    data: {
      input: prunedInput,
      output: [],
    },
    evaluationState: new Map(),
    // We pass our derived context to the pipeline
    user,
    channel,
    actions: {}, // Actions context if needed by pipeline?
    settings: BOTT_GLOBAL_SETTINGS, // Passing global settings if needed?
    abortSignal: _context.signal,
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

  // Update input events with lastProcessedAt
  try {
    const processingTime = new Date();

    await addEvents(
      ...pipelineContext.data.input.map((event) => {
        event.lastProcessedAt = processingTime;
        return event;
      }),
    );
  } catch (error) {
    log.warn(error);
  }

  const outputEvents: BottEvent[] = [];

  for (const event of pipelineContext.data.output) {
    if (!pipelineContext.evaluationState.get(event)?.outputReasons?.length) {
      continue;
    }

    const words =
      (event.detail.content as string).split(/\s+/).length;
    const delayMs = (words / TYPING_WORDS_PER_MINUTE) * MS_IN_MINUTE;
    const cappedDelayMs = Math.min(
      delayMs,
      TYPING_MAX_TIME_MS,
    );

    await delay(cappedDelayMs);

    globalThis.dispatchEvent(new BottEvent(event.type, {
      detail: event.detail,
      // Gemini does not return the full parent event
      parent: event.parent ? (await getEvents(event.parent.id))[0] : undefined,
      channel,
      user,
    }));
  }

  return outputEvents.map((event, index) => ({
    name: `response_${index}`,
    value: event as unknown as BottActionValue, // Cast to avoid strict union issues
  }));
}, {
  name: "simulateResponse",
  instructions: "Generate a response message from the conversation history.",
  schema: {
    input: [{
      name: "history",
      type: "event",
      description: "The conversation history events",
      required: true,
    }],
    output: [{
      name: "response",
      type: "event",
      description: "The generated response events",
    }],
  },
});
