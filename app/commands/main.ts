import { type CommandObject, createInfoEmbed } from "@bott/discord";

import { music } from "./music.ts";
import { photo } from "./photo.ts";
import { text } from "./text.ts";
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
              "Currently, @Bott can only read text when responding, and does not look at the chat when generating media. They may sometimes say things that are not correct.",
          },
          { name: "/text", value: text.description! },
          { name: "/photo", value: photo.description! },
          { name: "/music", value: music.description! },
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
  music,
  photo,
  text,
  video,
} as const;
