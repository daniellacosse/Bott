import { createBot } from "@infra/discord";
import { generateText } from "@infra/gemini";
import * as commands from "./commands/main.ts";
import * as instructions from "./instructions/main.ts";
import { Message } from "npm:discord.js";

const standardResponse = async (message: Message<true>) => {
  await message.channel.sendTyping();

  const response = await generateText(message.content.trim(), {
    instructions: instructions.standard.trim(),
  });

  return message.reply(response);
};

createBot({
  commands,
  directMessage: standardResponse,
  channelMention: standardResponse,
  channelReply: standardResponse,
  async channelMessage(message) {
    // if proactive mode is on, gemini is randomly asked if it would like to respond
    if (!Deno.env.get("CONFIG_PROACTIVE_MODE")) {
      return;
    }

    if (Math.random() > Number(Deno.env.get("CONFIG_PROACTIVE_CHANCE"))) {
      return;
    }

    const response = await generateText(message.content.trim(), {
      instructions: instructions.proactive.trim(),
    });

    if (response === instructions.proactiveIgnore) {
      // gemini decided to ignore this message
      return;
    }

    return message.reply(response);
  },
});
