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
  generateMusicFile,
  generatePhotoFile,
  generateTextFile,
  generateVideoFile,
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
        remainingSwaps: 3,
        record: [],
        config: {
          maximumSequentialSwaps: 3,
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
                  file = await generateVideoFile(prompt, context);
                  break;
                case GeneratedMediaType.SONG:
                  file = await generateMusicFile(prompt, context);
                  break;
                case GeneratedMediaType.ESSAY:
                default:
                  file = await generateTextFile(prompt, context);
                  break;
              }
            } catch (error) {
              reject(error);
            }

            // TODO: Is this necessary?
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
    description: "TODO",
    options: [{
      name: "type",
      type: BottRequestOptionType.STRING,
      description: "TODO",
    }, {
      name: "prompt",
      type: BottRequestOptionType.STRING,
      description: "TODO",
    }],
  },
);
