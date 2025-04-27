import {
  ActionThrottler,
  type CommandObject,
  CommandOptionType,
} from "@bott/discord";
import { generateImage } from "@bott/gemini";
import { AttachmentBuilder } from "npm:discord.js";
import { RATE_LIMIT_IMAGES, RATE_LIMIT_WINDOW_MS } from "../constants.ts";

const imageThrottler = new ActionThrottler(
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_IMAGES,
);

export const image: CommandObject = {
  description:
    `Ask @Bott to generate an image: you can generate ${RATE_LIMIT_IMAGES} images a month. @Bott won't generate images containing people or sensitive subjects.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "A description of the image you want to generate.",
    required: true,
  }],
  async command(interaction) {
    if (!imageThrottler.attemptAction(interaction.user.id)) {
      throw new Error(
        `You have generated the maximum number of videos this month (${RATE_LIMIT_IMAGES}).`,
      );
    }

    const prompt = interaction.options.get("prompt")!.value as string;

    return interaction.editReply({
      content: `Here's my image for your prompt: **"${prompt}"**`,
      files: [
        new AttachmentBuilder(await generateImage(prompt), {
          name: "generated.png",
        }),
      ],
    });
  },
};
