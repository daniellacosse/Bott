// TODO(#16): encapsulate these concepts in infra
import { AttachmentBuilder } from "npm:discord.js";

import {
  type CommandObject,
  CommandOptionType,
  TaskThrottler,
} from "@bott/discord";
import { generateMusic } from "@bott/gemini";
import { RATE_LIMIT_MUSIC, RATE_LIMIT_WINDOW_MS } from "../constants.ts";

const musicLimiter = new TaskThrottler(
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MUSIC,
);

export const music: CommandObject = {
  description:
    `Ask @Bott to generate music: you can generate ${RATE_LIMIT_MUSIC} songs a month. @Bott won't generate music containing lyrics.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "A description of the music you want to generate.",
    required: true,
  }],
  async command(interaction) {
    if (!musicLimiter.canRun(interaction.user.id)) {
      throw new Error(
        `You have generated the maximum number of songs this month (${RATE_LIMIT_MUSIC}).`,
      );
    }

    musicLimiter.recordRun(interaction.user.id);

    const prompt = interaction.options.get("prompt")!.value as string;

    console.info(`[INFO] Recieved music prompt "${prompt}".`);

    return interaction.followUp({
      content: `Here's my music for your prompt: **"${prompt}"**`,
      files: [
        new AttachmentBuilder(await generateMusic(prompt), {
          name: "generated.wav",
        }),
      ],
    });
  },
};
