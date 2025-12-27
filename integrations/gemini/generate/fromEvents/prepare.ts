import {
  ACTION_RESPONSE_AUDIO_COUNT_LIMIT,
  ACTION_RESPONSE_EVENT_COUNT_LIMIT,
  ACTION_RESPONSE_FILE_TOKEN_LIMIT,
  ACTION_RESPONSE_HISTORY_SIZE_MS,
  ACTION_RESPONSE_VIDEO_COUNT_LIMIT,
  APP_USER,
} from "@bott/common";
import { BottEventAttachmentType, type ShallowBottEvent } from "@bott/system";
import type {
  Content,
  Part,
} from "@google/genai";
import { encodeBase64 } from "@std/encoding/base64";
import type { EventPipelineContext } from "../../actions/response/pipeline/types.ts";


export const prepareContents = async (
  events: ShallowBottEvent[],
  context: EventPipelineContext,
  useThirdPersonAnalysis?: boolean,
): Promise<Content[]> => {
  const preparedInput: Content[] = [];
  const timeCutoff = Date.now() - ACTION_RESPONSE_HISTORY_SIZE_MS;
  const resourceAccumulator = {
    tokens: 0,
    audioFiles: 0,
    videoFiles: 0,
  };

  // Iterate backwards to prioritize the most recent events
  for (
    let i = events.length - 1;
    i >= 0 && preparedInput.length < ACTION_RESPONSE_EVENT_COUNT_LIMIT &&
    new Date(events[i].createdAt).getTime() > timeCutoff;
    i--
  ) {
    const event = events[i];

    const eventPart = {
      ...event,
      createdAt: formatTimestampAsRelative(event.createdAt) as string,
      lastProcessedAt: formatTimestampAsRelative(event.lastProcessedAt),
      attachments: undefined, // Handled below
      _pipelineEvaluationMetadata: context?.evaluationState.get(event.id),
    };

    if (event.parent) {
      eventPart.parent = {
        ...event.parent,
        createdAt: formatTimestampAsRelative(event.parent.createdAt) as string,
        lastProcessedAt: formatTimestampAsRelative(
          event.parent.lastProcessedAt,
        ),
        attachments: undefined,
      };
    }

    const parts: Part[] = [{ text: JSON.stringify(eventPart) }];
    for (const attachment of event?.attachments ?? []) {
      const newTotalTokens = resourceAccumulator.tokens +
        attachment.compressed.file.size;

      // TODO: PDFs clearly don't follow this rule
      if (newTotalTokens > ACTION_RESPONSE_FILE_TOKEN_LIMIT) continue;

      const isAudio =
        attachment.compressed.file.type === BottEventAttachmentType.MP3 ||
        attachment.compressed.file.type === BottEventAttachmentType.OPUS ||
        attachment.compressed.file.type === BottEventAttachmentType.WAV;

      if (
        isAudio &&
        resourceAccumulator.audioFiles >= ACTION_RESPONSE_AUDIO_COUNT_LIMIT
      ) continue;

      const isVideo =
        attachment.compressed.file.type === BottEventAttachmentType.MP4;

      if (
        isVideo &&
        resourceAccumulator.videoFiles >= ACTION_RESPONSE_VIDEO_COUNT_LIMIT
      ) continue;

      const fileData = await Deno.readFile(attachment.compressed.path);

      parts.push(
        {
          text: `AttachmentID: ${attachment.id}`,
        },
        {
          inlineData: {
            mimeType: attachment.compressed.file.type,
            data: encodeBase64(fileData),
          },
        },
      );

      resourceAccumulator.tokens = newTotalTokens;
      if (isAudio) resourceAccumulator.audioFiles++;
      if (isVideo) resourceAccumulator.videoFiles++;
    }

    let speaker = "user";

    const fromSystem = eventPart.user.id === APP_USER.id ||
      eventPart.user.id === "service:action";

    if (useThirdPersonAnalysis) {
      speaker = "user";
    } else if (fromSystem) {
      speaker = "model";
    }

    preparedInput.unshift({
      role: speaker,
      parts,
    });
  }

  return preparedInput;
};



/**
 * Formats an ISO timestamp as a human-readable relative time string.
 * Examples: "just now", "2 minutes ago", "3 hours ago", "5 days ago"
 * @internal Exported for testing purposes only
 */
export const formatTimestampAsRelative = (
  timestamp: string | undefined,
): string | undefined => {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }

  return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
};
