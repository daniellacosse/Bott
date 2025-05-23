import {
  type CommandObject,
  CommandOptionType,
  createTask,
} from "@bott/discord";
import { generateVideoFile } from "@bott/gemini";
import { RATE_LIMIT_VIDEOS, RATE_LIMIT_WINDOW_MS } from "../constants.ts";

export const video: CommandObject = {
  description:
    `Ask @Bott to generate a short 6-second video: you can generate up to ${RATE_LIMIT_VIDEOS} videos a month.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "A description of the video you want to generate.",
    required: true,
  }],
  command(commandEvent) {
    const taskBucketId = `video-${commandEvent.user?.id}`;
    const prompt = commandEvent.details.prompt;

    console.info(`[INFO] Recieved video prompt "${prompt}".`);

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
          resolve({
            ...commandEvent,
            user: this.user,
            details: {
              content: `Here's my video for your prompt: **"${prompt}"**`,
            },
            files: [
              await generateVideoFile(prompt, {
                abortSignal,
              }),
            ],
          });
        }),
      );
    });
  },
};
