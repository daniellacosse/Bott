// TODO(#16): encapsulate these concepts in infra
import { AttachmentBuilder } from "npm:discord.js";

import {
  type CommandObject,
  CommandOptionType,
  TaskLimiter,
} from "@bott/discord";
import { generatePhoto } from "@bott/gemini";
import { RATE_LIMIT_IMAGES, RATE_LIMIT_WINDOW_MS } from "../constants.ts";

const photoLimiter = new TaskLimiter(
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_IMAGES,
);

export const photo: CommandObject = {
  description:
    `Ask @Bott to generate a photo: you can generate ${RATE_LIMIT_IMAGES} photos a month. @Bott won't generate photos containing people or sensitive subjects.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "A description of the photo you want to generate.",
    required: true,
  }],
  async command(interaction) {
    if (!photoLimiter.canRun(interaction.user.id)) {
      throw new Error(
        `You have generated the maximum number of photos this month (${RATE_LIMIT_IMAGES}).`,
      );
    }

    photoLimiter.recordRun(interaction.user.id);

    const prompt = interaction.options.get("prompt")!.value as string;

    console.info(`[INFO] Recieved photo prompt "${prompt}".`);

    return interaction.editReply({
      content: `Here's my photo for your prompt: **"${prompt}"**`,
      files: [
        new AttachmentBuilder(await generatePhoto(prompt), {
          name: "generated.png",
        }),
      ],
    });
  },
};
