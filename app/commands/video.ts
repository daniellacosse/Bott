import { BottEventType } from "@bott/model";
import { CommandOptionType, createCommand, createTask } from "@bott/discord";
import { generateVideoFile } from "@bott/gemini";

import { RATE_LIMIT_VIDEOS, RATE_LIMIT_WINDOW_MS } from "../constants.ts";

export const video = createCommand<{
  prompt: string;
}>({
  name: "video",
  description:
    `Ask @Bott to generate a short 6-second video: you can generate up to ${RATE_LIMIT_VIDEOS} videos a month.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "A description of the video you want to generate.",
    required: true,
  }],
}, function (commandEvent) {
  const taskBucketId = `video-${commandEvent.user?.id}`;
  const prompt = commandEvent.details.options.prompt;

  console.info(`[INFO] Received video prompt "${prompt}".`);

  if (!this.taskManager.has(taskBucketId)) {
    this.taskManager.add({
      name: taskBucketId,
      record: [],
      remainingSwaps: 1,
      config: {
        throttle: {
          windowMs: RATE_LIMIT_WINDOW_MS,
          limit: RATE_LIMIT_VIDEOS,
        },
        maximumSequentialSwaps: 1,
      },
    });
  }

  return new Promise((resolve) => {
    this.taskManager.push(
      taskBucketId,
      createTask(async (abortSignal) => {
        const file = await generateVideoFile(prompt, {
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
            content: `Here's my video for your prompt: **"${prompt}"**`,
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
