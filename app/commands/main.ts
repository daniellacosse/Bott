import { type CommandObject, createInfoEmbed } from "@bott/discord";

import { image } from "./image.ts";
import { prompt } from "./prompt.ts";
import { video } from "./video.ts";

const help: CommandObject = {
  description: "Get help with @Bott.",
  command(interaction) {
    return interaction.editReply({
      embeds: [createInfoEmbed("Help Menu", {
        fields: [
          {
            name: "About",
            value:
              "@Bott (they/them) is a helpful agent that responds to your messages and generates images and videos.",
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

export default {
  help,
  image,
  prompt,
  video,
} as const;
