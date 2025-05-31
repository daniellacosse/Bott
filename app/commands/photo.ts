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
}, function (functionRequestEvent) {
  const taskBucketId = `photo-${functionRequestEvent.user?.id}`;
  const prompt = functionRequestEvent.details.options.prompt;

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

  return new Promise((resolve) => {
    this.taskManager.push(
      taskBucketId,
      createTask(async (abortSignal) => {
        const file = await generatePhotoFile(prompt, {
          abortSignal,
        });

        if (abortSignal.aborted) {
          return;
        }

        const event = {
          id: crypto.randomUUID(),
          type: BottEventType.FUNCTION_RESPONSE as const,
          user: this.user,
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
