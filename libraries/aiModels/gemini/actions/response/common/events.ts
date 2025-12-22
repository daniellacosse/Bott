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

import {
  ACTION_RESPONSE_FILE_TOKEN_LIMIT,
  ACTION_RESPONSE_EVENT_COUNT_LIMIT as INPUT_EVENT_COUNT_LIMIT,
  ACTION_RESPONSE_HISTORY_SIZE_MS as INPUT_EVENT_TIME_LIMIT_MS,
  ACTION_RESPONSE_AUDIO_COUNT_LIMIT as INPUT_FILE_AUDIO_COUNT_LIMIT,
  ACTION_RESPONSE_VIDEO_COUNT_LIMIT as INPUT_FILE_VIDEO_COUNT_LIMIT,
} from "@bott/constants";
import {
  BottAttachmentType,
  type BottActionCallEvent,
  type BottEvent,
  BottEventType,
  type BottEventAttachment,
} from "@bott/events";
import { getEvents } from "@bott/storage";
import type { EventPipelineContext } from "../pipeline/types.ts";

export const prepareInputEvents = (events: BottEvent[]): BottEvent[] => {
  const preparedInput: BottEvent[] = [];
  const now = Date.now();
  const timeCutoff = now - INPUT_EVENT_TIME_LIMIT_MS;
  const resourceAccumulator = {
    tokens: 0,
    audioFiles: 0,
    videoFiles: 0,
  };

  // Iterate backwards to prioritize the most recent events
  for (
    let i = events.length - 1;
    i >= 0 && preparedInput.length < INPUT_EVENT_COUNT_LIMIT;
    i--
  ) {
    if (events[i].createdAt.getTime() < timeCutoff) {
      break;
    }

    const event = structuredClone(events[i]);

    if (!event.attachments) {
      preparedInput.unshift(event);
      continue;
    }

    const attachmentsToKeep = [];
    for (const attachment of event.attachments) {
      if (!attachment.compressed?.file) continue;

      const newTotalTokens = resourceAccumulator.tokens +
        attachment.compressed.file.size;

      if (newTotalTokens > ACTION_RESPONSE_FILE_TOKEN_LIMIT) continue;

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

    if (attachmentsToKeep.length) {
      event.attachments = attachmentsToKeep;
    }

    preparedInput.unshift(event);
  }

  return preparedInput;
};

// TODO: this should probably happen in queryGemini
export const resolveOutputEvents = async (
  context: EventPipelineContext,
): Promise<BottEvent[]> => {
  const attachmentIndex = makeAttachmentIndex(context);
  const outputEvents = context.data.output;
  const resolvedEvents: BottEvent[] = [];

  for (const unresolvedEvent of outputEvents) {
    // TODO: create a new BottEvent instead of cloning so we don't have to force assign parent
    const event = structuredClone(unresolvedEvent);

    // Ensure full parent object is fetched
    if (event.parent) {
      const [fetchedParent] = await getEvents(event.parent.id);

      // Force read-only assignment
      Object.assign(event.parent, fetchedParent);
    }

    // Ensure file parameters are resolved
    if (
      event.type === BottEventType.ACTION_CALL &&
      event.detail.parameters
    ) {
      const actionCallEvent = event as BottActionCallEvent;

      for (const parameter of actionCallEvent.detail.parameters) {
        if (parameter.type !== "file") continue;

        const attachment = attachmentIndex.get(
          parameter.value as string,
        );

        if (attachment?.compressed?.file) {
          parameter.value = attachment.compressed.file;
        } else if (attachment?.raw?.file) {
          // Fallback to raw if compressed isn't available
          parameter.value = attachment.raw.file;
        } else {
          // Remove parameter by object reference if attachment isn't found
          actionCallEvent.detail.parameters = actionCallEvent.detail.parameters
            .filter(
              (param) => param !== parameter,
            );
        }
      }
    }

    resolvedEvents.push(event);
  }

  return resolvedEvents;
};

type BottAttachmentIndex = Map<string, BottEventAttachment>;

function makeAttachmentIndex(
  context: EventPipelineContext,
): BottAttachmentIndex {
  const attachmentIndex: BottAttachmentIndex = new Map();

  for (const event of context.data.input) {
    if (!event.attachments) continue;

    for (const attachment of event.attachments) {
      attachmentIndex.set(attachment.id, attachment);
    }
  }

  return attachmentIndex;
}
