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
  type AnyShape,
  type BottChannel,
  type BottEvent,
  BottEventType,
  type BottFile,
  BottFileType,
  type BottRequestEvent,
  type BottRequestHandler,
  type BottUser,
} from "@bott/model";
import { addEventData, type getEvents } from "@bott/storage";

import gemini from "../client.ts";
import {
  CONFIG_EVENTS_MODEL,
  INPUT_EVENT_LIMIT,
  INPUT_FILE_AUDIO_COUNT_LIMIT,
  INPUT_FILE_TOKEN_LIMIT,
  INPUT_FILE_VIDEO_COUNT_LIMIT,
} from "../constants.ts";
import { getGenerateResponseInstructions } from "./instructions.ts";
import { log } from "@bott/logger";
import { getOutputEventSchema } from "./output.ts";

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
  inputEvents: BottEvent<
    { content: string; scores?: Record<string, number> }
  >[],
  {
    model = CONFIG_EVENTS_MODEL,
    abortSignal,
    context,
    getEvents,
    requestHandlers,
  }: GeminiResponseContext<O>,
): AsyncGenerator<
  | BottEvent<{ content: string; scores?: Record<string, number> }>
  | BottRequestEvent<O>
> {
  const modelUserId = context.user.id;
  const contents: Content[] = [];
  let pointer = inputEvents.length;

  // We only want the model to respond to events that haven't been scored yet:
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

    // Remove unnecessary parent files from events:
    if (event.parent) {
      delete event.parent.files;
    }

    // Prune old, stale files that bloat the context window:
    if (event.files?.length) {
      const filesToKeep = [];
      for (const file of event.files) {
        let shouldPrune = false;

        if (!file.compressed) {
          continue;
        }

        if (
          resourceAccumulator.estimatedTokens +
              file.compressed.data.byteLength >
            INPUT_FILE_TOKEN_LIMIT
        ) {
          shouldPrune = true;
        } else if (
          file.compressed.type === BottFileType.OPUS &&
          resourceAccumulator.audioFiles >= INPUT_FILE_AUDIO_COUNT_LIMIT
        ) {
          shouldPrune = true;
        } else if (
          file.compressed.type === BottFileType.MP4 &&
          resourceAccumulator.videoFiles >= INPUT_FILE_VIDEO_COUNT_LIMIT
        ) {
          shouldPrune = true;
        }

        if (shouldPrune) {
          continue;
        }

        filesToKeep.push(file);

        if (file.compressed.type === BottFileType.OPUS) {
          resourceAccumulator.audioFiles++;
        } else if (file.compressed.type === BottFileType.MP4) {
          resourceAccumulator.videoFiles++;
        }

        resourceAccumulator.estimatedTokens += file.compressed.data.byteLength;
      }

      if (filesToKeep.length) {
        event.files = filesToKeep as BottFile[];
      } else {
        delete event.files;
      }
    }

    if (!event.details.scores) {
      resourceAccumulator.unseenEvents++;
    }

    contents.unshift(_transformBottEventToContent(event, modelUserId));

    if (contents.length >= INPUT_EVENT_LIMIT) {
      break;
    }
  }

  if (contents.length === 0) {
    log.debug("No events to process");
    return;
  }

  log.debug(
    `Generating response to ${resourceAccumulator.unseenEvents} events, with ${resourceAccumulator.audioFiles} audio files and ${resourceAccumulator.videoFiles} video files...`,
  );
  const response = await gemini.models.generateContent({
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

  const result = JSON.parse(
    response.candidates?.[0]?.content?.parts
      ?.filter((part: Part) => "text" in part && typeof part.text === "string")
      .map((part: Part) => (part as { text: string }).text)
      .join("") ?? "",
  );

  // Update scored input events in the database
  if (result.scoredInputEvents.length > 0) {
    try {
      await addEventData(...result.scoredInputEvents);
      log.debug(
        `Updated ${result.scoredInputEvents.length} events with scores`,
      );
    } catch (error) {
      log.error(`Failed to update events with scores: ${error}`);
    }
  }

  log.debug(
    `Processed ${result.scoredInputEvents.length} scored input events and ${result.filteredOutputEvents.length} filtered output events`,
  );

  // Yield the filtered output events
  for (const event of result.filteredOutputEvents) {
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

const _transformBottEventToContent = (
  event: BottEvent<{ content: string; scores?: Record<string, number> }>,
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
      if (!file.compressed) {
        continue;
      }

      parts.push({
        inlineData: {
          mimeType: file.compressed.type,
          data: encodeBase64(file.compressed.data!),
        },
      });
    }
  }

  return content;
};
