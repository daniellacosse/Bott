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
  type BottActionCallEvent,
  type BottEvent,
  BottEventType,
  type BottFile,
  BottFileType,
  type BottGlobalSettings,
} from "@bott/model";
import { log } from "@bott/logger";
import { addEventData, getEvents } from "@bott/storage";

import gemini from "../client.ts";
import {
  CONFIG_EVENTS_MODEL,
  INPUT_EVENT_LIMIT,
  INPUT_FILE_AUDIO_COUNT_LIMIT,
  INPUT_FILE_TOKEN_LIMIT,
  INPUT_FILE_VIDEO_COUNT_LIMIT,
} from "../constants.ts";
import { getInstructions } from "./instructions/main.ts";

type GeminiEventGenerationResult = {
  inputEventScores: BottEvent<
    { content: string; scores: Record<string, GeminiEventTraitScore> }
  >[];
  outputEvents: (
    | BottEvent<
      { content: string; scores: Record<string, GeminiEventTraitScore> }
    >
    | BottEvent<
      {
        name: string;
        options: AnyShape;
        scores: Record<string, GeminiEventTraitScore>;
      }
    >
  )[];
  outputScores?: Record<string, GeminiEventTraitScore>;
};

type GeminiEventTraitScore = {
  score: number;
  rationale?: string;
};

export async function* generateEvents<O extends AnyShape>(
  inputEvents: BottEvent<
    { content: string; scores?: Record<string, number> }
  >[],
  {
    model = CONFIG_EVENTS_MODEL,
    abortSignal,
    settings,
    context,
  }: {
    model?: string;
    abortSignal: AbortSignal;
    settings: BottGlobalSettings;
    context; // TODO
  },
): AsyncGenerator<
  | BottEvent<{ content: string; scores?: Record<string, number> }>
  | BottActionCallEvent<O>
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
      event.type === BottEventType.ACTION_CALL ||
      event.type === BottEventType.ACTION_RESULT
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

  const { systemPrompt, responseSchema } = getInstructions(context);

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
        parts: [
          { text: context.identityPrompt },
          {
            text: systemPrompt,
          },
        ],
      },
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const result: GeminiEventGenerationResult = JSON.parse(
    response.candidates?.[0]?.content?.parts
      ?.filter((part: Part) => "text" in part && typeof part.text === "string")
      .map((part: Part) => (part as { text: string }).text)
      .join("") ?? "",
  );

  _logDebugGeminiResult(result);

  const sanitizedInputEvents = _sanitizeEvents(result.inputEventScores);
  const sanitizedOutputEvents = _sanitizeEvents<
    { content: string } | { name: string; options: AnyShape }
  >(result.outputEvents);

  if (sanitizedInputEvents.length > 0) {
    try {
      await addEventData(...sanitizedInputEvents);
      log.debug(
        `Added scores to ${sanitizedInputEvents.length} events.`,
      );
    } catch (error) {
      log.error(`Failed to update events with scores: ${error}`);
    }
  }

  for (const event of sanitizedOutputEvents) {
    const commonFields = {
      id: crypto.randomUUID(),
      type: event.type,
      timestamp: new Date(),
      user: context.user,
      channel: context.channel,
      // Gemini does not return the full parent event
      parent: event.parent ? (await getEvents(event.parent.id))[0] : undefined,
    };

    if (event.type === BottEventType.ACTION_CALL) {
      yield {
        ...commonFields,
        type: BottEventType.ACTION_CALL,
        details: event.details as {
          name: string;
          options: O;
          scores: Record<string, number>;
        },
      };
    } else {
      yield {
        ...commonFields,
        details: event.details as {
          content: string;
          scores: Record<string, number>;
        },
      };
    }
  }

  return;
}

const _truncateMessage = (message: string, maxWordCount = 12) => {
  const words = message.trim().split(/\s+/);

  return words.slice(0, maxWordCount).join(" ") + "…";
};

const _logDebugGeminiResult = (result: GeminiEventGenerationResult) => {
  let logMessage = "Gemini processing result:\n";

  for (const event of result.inputEventScores) {
    if (!event.details) {
      continue;
    }

    logMessage += `[INPUT] Scored event #${event.id}: "${
      _truncateMessage(event.details.content)
    }"\n`;

    for (const trait in event.details.scores) {
      logMessage += `  => [${trait}: ${event.details.scores[trait].score}] ${
        event.details.scores[trait].rationale ?? ""
      }\n`;
    }
  }

  for (const event of result.outputEvents) {
    if (!event.details) {
      continue;
    }

    if (event.type === BottEventType.ACTION_CALL) {
      const details = event.details as {
        name: string;
        options: AnyShape;
        scores: Record<string, GeminiEventTraitScore>;
      };
      logMessage += `[OUTPUT] Generated request \`${details.name}\`\n`;
      for (const option in details.options) {
        logMessage += `  => ${option}: ${details.options[option]}\n`;
      }
    } else {
      const details = event.details as {
        content: string;
        scores: Record<string, GeminiEventTraitScore>;
      };
      const parentInfo = event.parent
        ? ` (in reply to #${event.parent.id})`
        : "";
      logMessage += `[OUTPUT] Generated ${event.type}${parentInfo}: "${
        _truncateMessage(details.content)
      }"\n`;
    }

    for (const trait in event.details.scores) {
      logMessage += `  => [${trait}: ${event.details.scores[trait].score}] ${
        event.details.scores[trait].rationale ?? ""
      }\n`;
    }
  }

  if (result.outputScores) {
    logMessage += "[OVERALL SCORES]\n";
    for (const trait in result.outputScores) {
      logMessage += `  => [${trait}: ${result.outputScores[trait].score}] ${
        result.outputScores[trait].rationale ?? ""
      }\n`;
    }
  }

  log.debug(logMessage.trim());
};

const _sanitizeEvents = <T>(
  events: BottEvent<T & { scores: Record<string, GeminiEventTraitScore> }>[],
): BottEvent<T & { scores: Record<string, number> }>[] => {
  const result: BottEvent<T & { scores: Record<string, number> }>[] = [];

  for (const event of events) {
    const newEvent = {
      ...event,
      details: {
        ...event.details,
        scores: {} as Record<string, number>,
      },
    };

    for (const trait in event.details.scores) {
      newEvent.details.scores[trait] = event.details.scores[trait].score;
    }

    result.push(newEvent);
  }

  return result;
};

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
    const { ...parentToSerialize } = event.parent;

    if (parentToSerialize.files) {
      delete parentToSerialize.files;
    }

    if (parentToSerialize.parent) {
      // This level of nesting in this context is unnecessary.
      delete parentToSerialize.parent;
    }

    eventToSerialize.parent = parentToSerialize;
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
