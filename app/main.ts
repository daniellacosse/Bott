import { Client, Collection, Message } from "npm:discord.js";
import { startBot } from "@bott/discord";
import { generateText } from "@bott/gemini";
import * as commands from "./commands/main.ts";
import * as instructions from "./instructions/main.ts";
import { HISTORY_LENGTH } from "./constants.ts";

const formatMessage = (message: Message, focus?: boolean) => {
  const content = message.content.trim();

  if (!content) return undefined;

  let log = `<@${message.author.id}>: ${content}`;

  if (focus) {
    log = `${instructions.focusMarker} ${log}`;
  }

  return log;
};

const formatMessageCollection = (collection: Collection<string, Message>) => {
  return collection.map((message) => formatMessage(message)).slice(1).filter((
    text,
  ) => text !== undefined);
};

async function standardResponse(message: Message<true>, client: Client) {
  const formattedMessage = formatMessage(message, true);

  if (!formattedMessage) return;

  await message.channel.sendTyping();

  const recentHistory = await message.channel.messages.fetch({
    limit: HISTORY_LENGTH,
  });

  const response = await generateText(formattedMessage, {
    instructions: instructions.standard(client.user?.id).trim(),
    context: formatMessageCollection(recentHistory),
  });

  return message.reply(response);
}

startBot({
  commands,
  identityToken: Deno.env.get("DISCORD_TOKEN")!,
  // TODO(#7): support direct messages
  // directMessage: standardResponse,
  channelMention: standardResponse,
  channelReply: standardResponse,
  async channelMessage(message, client) {
    // if proactive mode is on, gemini is randomly asked if it would like to respond
    if (Math.random() > Number(Deno.env.get("CONFIG_PROACTIVE_REPLY_CHANCE"))) {
      return;
    }

    const formattedMessage = formatMessage(message, true);

    if (!formattedMessage) return;

    const recentHistory = await message.channel.messages.fetch({
      limit: HISTORY_LENGTH,
    });

    const response = await generateText(formattedMessage, {
      instructions: instructions.proactive(client.user?.id).trim(),
      context: formatMessageCollection(recentHistory),
    });

    if (response === instructions.ignoreMarker) {
      // gemini decided to ignore this message
      return;
    }

    return message.reply(response);
  },
  mount(client) {
    console.info(`[INFO] @Bott running at id <@${client?.user?.id ?? "unknown"}>`)
  }
});
