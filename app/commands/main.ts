import {
  type CommandObject,
  CommandOptionType,
  createInfoEmbed,
} from "@infra/discord";
import {
  generateImage,
  generateText,
  generateVideo,
} from "../../infra/gemini/main.ts";
import { AttachmentBuilder, InteractionEditReplyOptions } from "npm:discord.js";
import { Buffer } from "node:buffer";

export const help: CommandObject = {
  description: "List the Gemini bot commands",
  command(interaction) {
    return interaction.editReply({
      embeds: [createInfoEmbed("Help Menu", {
        fields: [
          { name: "/help", value: "Display this help menu." },
          { name: "/generate", value: generate.description as string },
        ],
      })],
    });
  },
};

// TODO(#1): configure settings per channel
// export const config: CommandObject = {
//   description: "Tweak Gemini AI behavior in the current channel",
//   options: [{
//     name: "config",
//     type: CommandOptionType.STRING,
//     description: "The configuration value you'd like to change.",
//     required: true
//   }, {
//     name: "value",
//     type: CommandOptionType.STRING,
//     description: "The value you'd like to set.",
//     required: true
//   }],
//   command(interaction) { }
// };

export const generate: CommandObject = {
  description: "Generate text, images, or video!",
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "The description of what you want to generate.",
    required: true,
  }, {
    name: "type",
    type: CommandOptionType.STRING,
    description:
      "`text`, `image`, or `video` (defaults to `text`)",
  }],
  async command(interaction) {
    const prompt = interaction.options.get("prompt")?.value as string;
    const type = interaction.options.get("type")?.value;

    const reply: InteractionEditReplyOptions = {
      content: `**Here's the ${type ?? "text"} for your prompt: "${prompt}"**`,
    };

    if (!type || type === "text") {
      reply.content += "\n\n" + await generateText(prompt);

      return interaction.editReply(reply);
    }

    let attachmentData;
    let attachmentFile;

    if (type === "image") {
      attachmentData = await generateImage(prompt);
      attachmentFile = "generated.png";
    } else { // video
      attachmentData = await generateVideo(prompt);
      attachmentFile = "generated.mp4";
    }

    reply.files = [
      new AttachmentBuilder(Buffer.from(attachmentData), {
        name: attachmentFile,
      }),
    ];

    return interaction.editReply(reply);
  },
};
