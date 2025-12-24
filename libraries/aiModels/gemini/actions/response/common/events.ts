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
  ACTION_RESPONSE_AUDIO_COUNT_LIMIT as INPUT_FILE_AUDIO_COUNT_LIMIT,
  ACTION_RESPONSE_EVENT_COUNT_LIMIT as INPUT_EVENT_COUNT_LIMIT,
  ACTION_RESPONSE_FILE_TOKEN_LIMIT,
  ACTION_RESPONSE_HISTORY_SIZE_MS as INPUT_EVENT_TIME_LIMIT_MS,
  ACTION_RESPONSE_VIDEO_COUNT_LIMIT as INPUT_FILE_VIDEO_COUNT_LIMIT,
  APP_USER,
} from "@bott/constants";
import {
  type BottActionCallEvent,
  BottAttachmentType,
  type BottEvent,
  type BottEventAttachment,
  BottEventType,
} from "@bott/events";
import { cloneBottEvent } from "@bott/events";
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

    const event = cloneBottEvent(events[i]);

    if (!event.attachments) {
      preparedInput.unshift(event);
      continue;
    }

    if (!event.user) {
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

export const resolveOutputEvents = async (
  context: EventPipelineContext,
): Promise<BottEvent[]> => {
  const attachmentIndex = makeAttachmentIndex(context);
  const outputEvents = context.data.output;
  const resolvedEvents: BottEvent[] = [];

  for (const unresolvedEvent of outputEvents) {
    // TODO: create a new BottEvent instead of cloning so we don't have to force assign parent
    const event = cloneBottEvent(unresolvedEvent);

    // Ensure full parent object is fetched
    if (event.parent) {
      const [fetchedParent] = await getEvents(event.parent.id);

      // Force read-only assignment
      Object.assign(event.parent, fetchedParent);
    }

    if (!event.user) {
      Object.assign(event, { user: APP_USER });
    }

    // Ensure file parameters are resolved
    if (
      event.type === BottEventType.ACTION_CALL &&
      event.detail.parameters
    ) {
      const actionCallEvent = event as BottActionCallEvent;
      const actionName = actionCallEvent.detail.name;
      const action = context.action.service.settings.actions[actionName];

      if (action?.parameters) {
        for (const parameterDefinition of action.parameters) {
          if (parameterDefinition.type !== "file") continue;

          const attachmentId =
            actionCallEvent.detail.parameters[parameterDefinition.name];

          if (!attachmentId) continue;

          const attachment = attachmentIndex.get(attachmentId as string);

          actionCallEvent.detail.parameters[parameterDefinition.name] =
            attachment?.compressed?.file ?? attachment?.raw?.file;
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
