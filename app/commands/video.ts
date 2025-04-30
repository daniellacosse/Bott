// TODO(#16): encapsulate these concepts in infra
import { AttachmentBuilder } from "npm:discord.js";

import {
  ActionThrottler,
  type CommandObject,
  CommandOptionType,
} from "@bott/discord";
import { generateVideo } from "@bott/gemini";
import { RATE_LIMIT_VIDEOS, RATE_LIMIT_WINDOW_MS } from "../constants.ts";

const videoThrottler = new ActionThrottler(
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_VIDEOS,
);

export const video: CommandObject = {
  description:
    `Ask @Bott to generate a short 6-second video: you can generate up to ${RATE_LIMIT_VIDEOS} videos a month.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "A description of the video you want to generate.",
    required: true,
  }],
  async command(interaction) {
    if (!videoThrottler.attemptAction(interaction.user.id)) {
      throw new Error(
        `You have generated the maximum number of videos this month (${RATE_LIMIT_VIDEOS}).`,
      );
    }

    const prompt = interaction.options.get("prompt")!.value as string;

    console.info(`[INFO] Recieved video prompt "${prompt}".`);

    return interaction.editReply({
      content: `Here's my video for your prompt: **"${prompt}"**`,
      files: [
        new AttachmentBuilder(await generateVideo(prompt), {
          name: "generated.mp4",
        }),
      ],
    });
  },
};
