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
} from "@bott/constants";
import {
  type BottActionCallEvent,
  BottAttachmentType,
  type BottEvent,
  type BottEventAttachment,
  BottEventType,
} from "@bott/events";
import { commit, getEvents, sql } from "@bott/storage";
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

/**
 * Transforms persona mentions from @handle back to @<personaId> format.
 * This is done by querying the database for personas matching the handle in the given space.
 * 
 * Handle format: alphanumeric characters, underscores, and hyphens ([\w-]+).
 * The regex is intentionally permissive to support various platform formats.
 * Platform-specific validations should enforce stricter rules (e.g., no leading/trailing
 * hyphens, no consecutive hyphens). The unique constraint on (handle, space_id) in the
 * database prevents actual conflicts.
 * 
 * @internal Exported for testing purposes only
 */
export const _transformHandlesToMentions = async (
  content: string,
  spaceId: string,
): Promise<string> => {
  // Match @handle patterns (word characters, underscores, and hyphens)
  const handlePattern = /@([\w-]+)/g;
  const matches = [...content.matchAll(handlePattern)];

  if (matches.length === 0) {
    return content;
  }

  // Extract unique handles
  const handles = [...new Set(matches.map((match) => match[1]))];

  // Query database for all matching personas
  // The sql template function properly parameterizes the array
  const result = commit(
    sql`
      select id, handle
      from personas
      where space_id = ${spaceId}
        and handle in (${handles})
    `,
  );

  if ("error" in result) {
    throw result.error;
  }

  // Build a map of handle -> personaId
  const handleToIdMap = new Map<string, string>();
  for (const row of result.reads) {
    handleToIdMap.set(row.handle, row.id);
  }

  // Replace @handle with @<personaId>
  let transformedContent = content;
  for (const match of matches) {
    const handle = match[1];
    const personaId = handleToIdMap.get(handle);

    if (personaId) {
      const handleToReplace = `@${handle}`;
      transformedContent = transformedContent.replaceAll(
        handleToReplace,
        `@<${personaId}>`,
      );
    }
  }

  return transformedContent;
};

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

    // Transform mentions from @handle back to @<personaId>
    if (
      event.detail?.content &&
      typeof event.detail.content === "string" &&
      event.channel?.space
    ) {
      event.detail.content = await _transformHandlesToMentions(
        event.detail.content,
        event.channel.space.id,
      );
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
