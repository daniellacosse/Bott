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

import { BottEventType } from "@bott/model";
import { CommandOptionType, createCommand, createTask } from "@bott/discord";
import { generatePhotoFile } from "@bott/gemini";

import { RATE_LIMIT_IMAGES, RATE_LIMIT_WINDOW_MS } from "../constants.ts";

export const photo = createCommand<{ prompt: string }>({
  name: "photo",
  description:
    `Ask @Bott to generate a photo: you can generate ${RATE_LIMIT_IMAGES} photos a month. @Bott won't generate photos containing sensitive subjects.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "A description of the photo you want to generate.",
    required: true,
  }],
}, function (commandEvent) {
  const taskBucketId = `photo-${commandEvent.user?.id}`;
  const prompt = commandEvent.details.options.prompt;

  console.info(`[INFO] Received photo prompt "${prompt}".`);

  if (!this.taskManager.has(taskBucketId)) {
    this.taskManager.add({
      name: taskBucketId,
      record: [],
      remainingSwaps: 1,
      config: {
        throttle: {
          limit: RATE_LIMIT_IMAGES,
          windowMs: RATE_LIMIT_WINDOW_MS,
        },
        maximumSequentialSwaps: 1,
      },
    });
  }

  return new Promise((resolve, reject) => {
    this.taskManager.push(
      taskBucketId,
      createTask(async (abortSignal) => {
        let file;

        try {
          file = await generatePhotoFile(prompt, {
            abortSignal,
          });
        } catch (error) {
          reject(error);
          return;
        }

        if (abortSignal.aborted) {
          return;
        }

        const event = {
          id: crypto.randomUUID(),
          type: BottEventType.FUNCTION_RESPONSE as const,
          user: this.user,
          channel: commandEvent.channel,
          details: {
            content: `Here's my photo for your prompt: **"${prompt}"**`,
          },
          files: [file],
          timestamp: new Date(),
        };

        file.parent = event;

        resolve(event);
      }),
    );
  });
});
