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
  BottEventType,
  type BottOutputFile,
  type BottRequestEvent,
  type BottRequestHandler,
  BottRequestOptionType,
  type BottResponseEvent,
} from "@bott/model";
import { storeOutputFile } from "@bott/storage";
import { createTask } from "@bott/task";
import {
  generateEssayFile,
  generateMovieFile,
  generatePhotoFile,
  generateSongFile,
} from "@bott/gemini";

import { taskManager } from "../tasks.ts";
import {
  RATE_LIMIT_IMAGES,
  RATE_LIMIT_MUSIC,
  RATE_LIMIT_VIDEOS,
  RATE_LIMIT_WINDOW_MS,
} from "../constants.ts";

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

export const generateMedia: BottRequestHandler<
  GenerateMediaOptions
> = Object.assign(
  function generateMedia(
    requestEvent: BottRequestEvent<{
      type: GeneratedMediaType;
      prompt: string;
    }>,
  ) {
    const { type, prompt } = requestEvent.details.options;

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
        remainingSwaps: 1, // Don't override media calls.
        record: [],
        config: {
          maximumSequentialSwaps: 1,
          throttle,
        },
      });
    }

    return new Promise<BottResponseEvent>(
      (resolve, reject) => {
        taskManager.push(
          type,
          createTask(async (abortSignal: AbortSignal) => {
            let file: BottOutputFile | undefined;

            try {
              const context = {
                abortSignal,
                storeOutputFile,
              };

              switch (type) {
                case GeneratedMediaType.PHOTO:
                  file = await generatePhotoFile(prompt, context);
                  break;
                case GeneratedMediaType.MOVIE:
                  file = await generateMovieFile(prompt, context);
                  break;
                case GeneratedMediaType.SONG:
                  file = await generateSongFile(prompt, context);
                  break;
                case GeneratedMediaType.ESSAY:
                default:
                  file = await generateEssayFile(prompt, context);
                  break;
              }
            } catch (error) {
              reject(error);
            }

            if (abortSignal.aborted) {
              throw new Error("Aborted task: after generating media");
            }

            // This shouldn't happen.
            if (!file) {
              throw new Error("Failed to generate media");
            }

            resolve({
              id: crypto.randomUUID(),
              type: BottEventType.RESPONSE as const,
              details: {
                content: "",
              },
              files: [file],
              timestamp: new Date(),
            });
          }),
        );
      },
    );
  },
  {
    description:
      `You can use this request to create photos, songs, videos and essays based on a user's message or the conversational context.
      When you decide to make this request, the system will handle the actual media generation based on the parameters you provide.
      IMPORTANT NOTE: Generating an 'essay' is particularly helpful when the situation calls for factual accuracy or nuance. When doing so, be sure to use user's names (e.g. "despoina") and not their ids (e.g. "<@USER_ID_001>").
      IMPORTANT NOTE: Avoid generating text in photos, it often looks like gibberish to humans.`,
    options: [{
      name: "type",
      type: BottRequestOptionType.STRING,
      allowedValues: [
        GeneratedMediaType.ESSAY,
        GeneratedMediaType.PHOTO,
        GeneratedMediaType.MOVIE,
        GeneratedMediaType.SONG,
      ],
      description: "The type of media to generate.",
    }, {
      name: "prompt",
      type: BottRequestOptionType.STRING,
      description:
        "A detailed description or prompt for the media to be generated. For example, 'a futuristic cityscape at sunset' for a photo, or 'a short story about a time-traveling cat' for an essay.",
    }],
  },
);
