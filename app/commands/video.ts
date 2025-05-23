// TODO(#16): encapsulate these concepts in infra
import { AttachmentBuilder } from "npm:discord.js";

import {
  type CommandObject,
  CommandOptionType,
  createTask,
} from "@bott/discord";
import { generateVideo } from "@bott/gemini";
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
  command(interaction) {
    const taskBucketId = `video-${interaction.user.id}`;

    if (!this.taskManager.has(taskBucketId)) {
      this.taskManager.add({
        name: taskBucketId,
        record: [],
        remainingSwaps: 1,
        config: {
          throttle: {
            limit: RATE_LIMIT_VIDEOS,
            windowMs: RATE_LIMIT_WINDOW_MS,
          },
          maximumSequentialSwaps: 1,
        },
      });
    }

    this.taskManager.push(
      taskBucketId,
      createTask(async (abortSignal) => {
        const prompt = interaction.options.get("prompt")!.value as string;

        console.info(`[INFO] Recieved video prompt "${prompt}".`);

        await interaction.followUp({
          content: `Here's my video for your prompt: **"${prompt}"**`,
          files: [
            new AttachmentBuilder(
              await generateVideo(prompt, {
                abortSignal,
              }),
              {
                name: "generated.mp4",
              },
            ),
          ],
        });
      }),
    );
  },
};
