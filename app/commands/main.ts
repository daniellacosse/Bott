import {
  ActionThrottler,
  type CommandObject,
  CommandOptionType,
  createInfoEmbed,
} from "@bott/discord";
import {
  generateImage,
  generateText,
  generateVideo,
} from "../../infra/gemini/main.ts";
import { AttachmentBuilder } from "npm:discord.js";

const DISCORD_MESSAGE_LIMIT = 2000;

export const prompt: CommandObject = {
  description:
    `Prompt @Bott directly as much as you like. Remember that Discord limits messages to ${DISCORD_MESSAGE_LIMIT} characters.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "Your prompt or question for @Bott.",
    required: true,
  }],
  async command(interaction) {
    const prompt = interaction.options.get("prompt")!.value as string;

    const response = await generateText(prompt as string, {
      instructions:
        `Try to keep your response under ${DISCORD_MESSAGE_LIMIT} characters.`,
    });

    let result = `
      Here's my response to your prompt: **"${prompt}"**
      
      > ${response}
    `.trim();

    if (result.length > DISCORD_MESSAGE_LIMIT) {
      result = result.slice(0, DISCORD_MESSAGE_LIMIT - 1) + "…";
    }

    return interaction.editReply(result);
  },
};

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;
const IMAGES_PER_USER_PER_MONTH = 100;

const imageThrottler = new ActionThrottler(
  FOUR_WEEKS_MS,
  IMAGES_PER_USER_PER_MONTH,
);

export const image: CommandObject = {
  description:
    `Ask @Bott to generate an image: you can generate ${IMAGES_PER_USER_PER_MONTH} images a month. @Bott won't generate images containing people or sensitive subjects.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "A description of the image you want to generate.",
    required: true,
  }],
  async command(interaction) {
    if (!imageThrottler.attemptAction(interaction.user.id)) {
      throw new Error(
        `You have generated the maximum number of videos this month (${IMAGES_PER_USER_PER_MONTH}).`,
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

const VIDEOS_PER_USER_PER_MONTH = 10;

const videoThrottler = new ActionThrottler(
  FOUR_WEEKS_MS,
  VIDEOS_PER_USER_PER_MONTH,
);

export const video: CommandObject = {
  description:
    `Ask @Bott to generate a short 6-second video: you can generate up to ${VIDEOS_PER_USER_PER_MONTH} videos a month.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "A description of the video you want to generate.",
    required: true,
  }],
  async command(interaction) {
    if (!videoThrottler.attemptAction(interaction.user.id)) {
      throw new Error(
        `You have generated the maximum number of videos this month (${VIDEOS_PER_USER_PER_MONTH}).`,
      );
    }

    const prompt = interaction.options.get("prompt")!.value as string;

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

export const help: CommandObject = {
  description: "Get help with @Bott.",
  command(interaction) {
    return interaction.editReply({
      embeds: [createInfoEmbed("Help Menu", {
        fields: [
          {
            name: "About",
            value:
              "@Bott is a helpful agent that responds to your messages and generates images and videos.",
          },
          {
            name: "Limitations",
            value:
              "Currently, @Bott can only read text when responding, and does not look at the chat when generating media.",
          },
          { name: "/prompt", value: prompt.description! },
          { name: "/image", value: image.description! },
          { name: "/video", value: video.description! },
          { name: "/help", value: "Display this Help Menu." },
        ],
        footer: "@Bott written by DanielLaCos.se ᛫ Powered by Google Gemini",
      })],
    });
  },
};
