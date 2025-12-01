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
  type BottAction,
  type BottActionCallEvent,
  BottActionOptionType,
  type BottActionResultEvent,
  BottEventType,
  type BottFileData,
} from "@bott/model";
import { createTask } from "@bott/task";
import {
  generateEssayData,
  generateMovieData,
  generatePhotoData,
  generateSongData,
} from "@bott/gemini";
import { log } from "@bott/logger";

import { taskManager } from "../tasks.ts";
import {
  RATE_LIMIT_IMAGES,
  RATE_LIMIT_MUSIC,
  RATE_LIMIT_VIDEOS,
  RATE_LIMIT_WINDOW_MS,
} from "../env.ts";

// Constants for AI prompt processing
const MAX_AI_PROMPT_LENGTH = 10000;
const LOG_TRUNCATE_LENGTH = 100;

/**
 * Sanitizes user input for AI prompts to prevent injection
 */
function sanitizeAIPrompt(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .trim()
    // Remove control characters except newlines and tabs
    // deno-lint-ignore no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .substring(0, MAX_AI_PROMPT_LENGTH);
}

enum GeneratedMediaType {
  ESSAY = "essay",
  PHOTO = "photo",
  MOVIE = "movie",
  SONG = "song",
}

export type GenerateMediaOptions = {
  type: GeneratedMediaType;
  prompt: string;
};

export const generateMedia: BottAction<
  GenerateMediaOptions
> = Object.assign(
  function generateMedia(
    requestEvent: BottActionCallEvent<{
      type: GeneratedMediaType;
      prompt: string;
    }>,
  ) {
    const { type, prompt: rawPrompt } = requestEvent.details.options;

    const prompt = sanitizeAIPrompt(rawPrompt);

    log.debug("generateMedia() called with options:", {
      type,
      prompt: prompt.substring(0, LOG_TRUNCATE_LENGTH) +
        (prompt.length > LOG_TRUNCATE_LENGTH ? "…" : ""),
    });

    if (!taskManager.has(type)) {
      let throttle;

      switch (type) {
        case GeneratedMediaType.PHOTO:
          throttle = {
            windowMs: RATE_LIMIT_WINDOW_MS,
            limit: RATE_LIMIT_IMAGES,
          };
          break;
        case GeneratedMediaType.MOVIE:
          throttle = {
            windowMs: RATE_LIMIT_WINDOW_MS,
            limit: RATE_LIMIT_VIDEOS,
          };
          break;
        case GeneratedMediaType.SONG:
          throttle = {
            windowMs: RATE_LIMIT_WINDOW_MS,
            limit: RATE_LIMIT_MUSIC,
          };
          break;
        case GeneratedMediaType.ESSAY:
        default:
          break;
      }

      taskManager.add({
        name: type,
        remainingSwaps: 0, // Don't override media calls.
        completions: [],
        config: {
          maximumSequentialSwaps: 0,
          throttle,
        },
      });
    }

    return new Promise<BottActionResultEvent>(
      (resolve, reject) => {
        taskManager.push(
          type,
          createTask(async (abortSignal: AbortSignal) => {
            let fileData: BottFileData | undefined;

            try {
              const context = {
                abortSignal,
              };

              switch (type) {
                case GeneratedMediaType.PHOTO:
                  fileData = await generatePhotoData(prompt, context);
                  break;
                case GeneratedMediaType.MOVIE:
                  fileData = await generateMovieData(prompt, context);
                  break;
                case GeneratedMediaType.SONG:
                  fileData = await generateSongData(prompt, context);
                  break;
                case GeneratedMediaType.ESSAY:
                default:
                  fileData = await generateEssayData(prompt, context);
                  break;
              }
            } catch (error) {
              reject(error);
            }

            if (abortSignal.aborted) {
              throw new Error("Aborted task: after generating media");
            }

            // This shouldn't happen.
            if (!fileData) {
              throw new Error("Failed to generate media");
            }

            resolve({
              id: crypto.randomUUID(),
              type: BottEventType.ACTION_RESULT as const,
              details: {
                content: "",
              },
              files: [{
                id: crypto.randomUUID(),
                raw: fileData,
              }],
              timestamp: new Date(),
              user: requestEvent.user,
              channel: requestEvent.channel,
              parent: requestEvent,
            });
          }),
        );
      },
    );
  },
  {
    description:
      `Use this to create a photo, song, movie, or essay. The system handles the generation and posts the media directly to the channel.
      IMPORTANT: The system can only generate one of each media type (e.g., one photo and one song) at a time. Because the media is sent directly, it might appear without context. It's good practice to send a companion message to explain what you're doing (e.g., "On it, generating an image for you...").
      - For 'essays', which are good for factual or nuanced topics, use real names (e.g., "despoina") instead of user IDs (e.g., "<@USER_ID_001>").
      - For 'photos', avoid including text in the prompt if it's over 20 characters.`,
    options: [{
      name: "type",
      type: BottActionOptionType.STRING,
      allowedValues: [
        GeneratedMediaType.ESSAY,
        GeneratedMediaType.PHOTO,
        GeneratedMediaType.MOVIE,
        GeneratedMediaType.SONG,
      ],
      description:
        "The type of media to generate: 'essay', 'photo', 'movie', or 'song'.",
      required: true,
    }, {
      name: "prompt",
      type: BottActionOptionType.STRING,
      description:
        "A highly detailed prompt for the media. Be excruciatingly precise. Pull in as much relevant context from the conversation as possible to make the generated media specific and relevant.",
      required: true,
    }],
  },
);
