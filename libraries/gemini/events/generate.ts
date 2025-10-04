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

import { BottFileType } from "@bott/model";
import type {
  BottAction,
  BottChannel,
  BottEvent,
  BottGlobalSettings,
  BottUser,
} from "@bott/model";
import { addEventData } from "@bott/storage";

import pipeline, { type EventPipelineContext } from "./pipeline/main.ts";

import { getEvents } from "@bott/storage";

import {
  INPUT_EVENT_COUNT_LIMIT,
  INPUT_EVENT_TIME_LIMIT_MS,
  INPUT_FILE_AUDIO_COUNT_LIMIT,
  INPUT_FILE_TOKEN_LIMIT,
  INPUT_FILE_VIDEO_COUNT_LIMIT,
} from "../constants.ts";

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

    if (event.timestamp.getTime() < timeCutoff) {
      break;
    }

    if (event.files) {
      const filesToKeep = [];
      for (const file of event.files) {
        if (!file.compressed) continue;

        const newTotalTokens = resourceAccumulator.tokens +
          file.compressed.data.byteLength;

        if (newTotalTokens > INPUT_FILE_TOKEN_LIMIT) continue;

        const isAudio = file.compressed.type === BottFileType.MP3 ||
          file.compressed.type === BottFileType.OPUS ||
          file.compressed.type === BottFileType.WAV;

        if (
          isAudio &&
          resourceAccumulator.audioFiles >= INPUT_FILE_AUDIO_COUNT_LIMIT
        ) continue;

        const isVideo = file.compressed.type === BottFileType.MP4;

        if (
          isVideo &&
          resourceAccumulator.videoFiles >= INPUT_FILE_VIDEO_COUNT_LIMIT
        ) continue;

        filesToKeep.push(file);

        resourceAccumulator.tokens = newTotalTokens;
        if (isAudio) resourceAccumulator.audioFiles++;
        if (isVideo) resourceAccumulator.videoFiles++;
      }

      event.files = filesToKeep.length > 0 ? filesToKeep : undefined;
    }

    prunedInput.unshift(event);
  }

  let pipelineContext: EventPipelineContext = {
    data: {
      input: prunedInput,
      output: [],
    },
    ...context,
  };

  for (const processor of pipeline) {
    try {
      pipelineContext = await processor(pipelineContext);
    } catch {
      // TODO
    }
  }

  try {
    // Update the newly scored events
    await addEventData(...pipelineContext.data.input);
  } catch {
    // TODO
  }

  for (const event of pipelineContext.data.output) {
    yield {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      user: context.user,
      channel: context.channel,
      // Gemini does not return the full parent event
      parent: event.parent ? (await getEvents(event.parent.id))[0] : undefined,
    };
  }

  return;
}
