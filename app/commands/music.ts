// TODO(#16): encapsulate these concepts in infra
import { AttachmentBuilder } from "npm:discord.js";

import {
  type CommandObject,
  CommandOptionType,
  createTask,
} from "@bott/discord";
import { generateMusic } from "@bott/gemini";
import { RATE_LIMIT_MUSIC, RATE_LIMIT_WINDOW_MS } from "../constants.ts";

export const music: CommandObject = {
  description:
    `Ask @Bott to generate music: you can generate ${RATE_LIMIT_MUSIC} songs a month. @Bott won't generate music containing lyrics.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "A description of the music you want to generate.",
    required: true,
  }],
  command(interaction) {
    const taskBucketId = `music-${interaction.user.id}`;

    if (!this.taskManager.has(taskBucketId)) {
      this.taskManager.add({
        name: taskBucketId,
        record: [],
        remainingSwaps: 1,
        config: {
          throttle: {
            limit: RATE_LIMIT_MUSIC,
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
              await generateMusic(prompt, {
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
