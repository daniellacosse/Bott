import { BottEventType } from "@bott/model";
import { createCommand, createInfoEmbed } from "@bott/discord";

import { music } from "./music.ts";
import { photo } from "./photo.ts";
import { text } from "./text.ts";
import { video } from "./video.ts";

const help = createCommand({
  name: "help",
  description: "Get help with @Bott.",
}, function () {
  return Promise.resolve({
    id: crypto.randomUUID(),
    type: BottEventType.FUNCTION_RESPONSE,
    user: this.user,
    details: {
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
    },
    timestamp: new Date(),
  });
});

export default [help, text, photo, music, video];
