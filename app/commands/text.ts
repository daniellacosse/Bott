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
import { generateTextFile } from "@bott/gemini";

export const text = createCommand<{ prompt: string }>({
  name: "text",
  description: `Prompt @Bott for a text response as much as you like.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "Your prompt for @Bott.",
    required: true,
  }],
}, function (commandEvent) {
  const taskBucketId = `text-${commandEvent.user?.id}`;
  const prompt = commandEvent.details.options.prompt;

  console.info(`[INFO] Received text prompt "${prompt}".`);

  if (!this.taskManager.has(taskBucketId)) {
    this.taskManager.add({
      name: taskBucketId,
      record: [],
      remainingSwaps: 1,
      config: {
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
          file = await generateTextFile(prompt, {
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
            content: `Here's my text for your prompt: **"${prompt}"**`,
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
