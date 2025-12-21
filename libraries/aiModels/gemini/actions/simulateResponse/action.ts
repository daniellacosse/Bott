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
import type { BottAction, BottActionSettings } from "@bott/actions";
import {
  BOTT_USER,
  INPUT_EVENT_COUNT_LIMIT,
  INPUT_EVENT_TIME_LIMIT_MS,
  INPUT_FILE_AUDIO_COUNT_LIMIT,
  INPUT_FILE_TOKEN_LIMIT,
  INPUT_FILE_VIDEO_COUNT_LIMIT,
  TYPING_MAX_TIME_MS,
  TYPING_WORDS_PER_MINUTE,
} from "@bott/constants";
import { log } from "@bott/log";
import { BottAttachmentType, type BottEvent } from "@bott/model";
import { BottServiceEvent } from "@bott/service";
import { addEvents, getEventIdsForChannel, getEvents } from "@bott/storage";

import { delay } from "@std/async";

import pipeline, { type EventPipelineContext } from "./pipeline/main.ts";

const MS_IN_MINUTE = 60 * 1000;

const settings: BottActionSettings = {
  name: "simulateResponseForChannel",
  instructions: "Simulate a response for a channel.",
  parameters: [
    {
      name: "channelId",
      type: "string",
      description: "The ID of the channel to simulate a response for.",
      required: true,
    },
  ],
};

export const responseAction: BottAction = createAction(
  async function* ({ channelId }) {
    const eventHistoryIds = getEventIdsForChannel(
      channelId as string,
    );
    const channelHistory = await getEvents(...eventHistoryIds);

    const prunedInput: BottEvent[] = [];
    const now = Date.now();
    const timeCutoff = now - INPUT_EVENT_TIME_LIMIT_MS;

    const resourceAccumulator = {
      tokens: 0,
      audioFiles: 0,
      videoFiles: 0,
    };

    // Iterate backwards to prioritize the most recent events
    for (let i = channelHistory.length - 1; i >= 0; i--) {
      if (prunedInput.length >= INPUT_EVENT_COUNT_LIMIT) {
        break;
      }

      const event = structuredClone(channelHistory[i]);

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
    const latestEvent = channelHistory[channelHistory.length - 1]; // Assuming ascending order input
    const channel = latestEvent?.channel;

    // Use bot user as the actor
    const user = BOTT_USER;

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
      actions: {},
      settings: this.globalSettings,
      abortSignal: this.signal,
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

    for (const event of pipelineContext.data.output) {
      if (!pipelineContext.evaluationState.get(event)?.outputReasons?.length) {
        continue;
      }

      const content = typeof event.detail?.content === "string"
        ? event.detail.content
        : "";
      const words = content.split(/\s+/).length;
      const delayMs = (words / TYPING_WORDS_PER_MINUTE) * MS_IN_MINUTE;
      const cappedDelayMs = Math.min(
        delayMs,
        TYPING_MAX_TIME_MS,
      );

      await delay(cappedDelayMs, { signal: this.signal });

      yield new BottServiceEvent(event.type, {
        detail: event.detail,
        // Gemini does not return the full parent event
        parent: event.parent
          ? (await getEvents(event.parent.id))[0]
          : undefined,
        channel,
        user,
      });
    }
  },
  settings,
);
