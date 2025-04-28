import { Client, Collection, Message } from "npm:discord.js";

import { startBot } from "@bott/discord";
import { generateText } from "@bott/gemini";

import { DISCORD_MESSAGE_LIMIT, HISTORY_LENGTH } from "./constants.ts";
import {
  ignoreMarker,
  proactiveInstructions,
  standardInstructions,
  subjectMarker,
} from "./instructions/main.ts";
import commands from "./commands/main.ts";

const formatMessage = (message: Message, focus?: boolean) => {
  const content = message.content.trim();

  if (!content) return undefined;

  let log = `<@${message.author.id}>: ${content}`;

  if (focus) {
    log = `${subjectMarker} ${log}`;
  }

  return log;
};

const formatMessageCollection = (collection: Collection<string, Message>) => {
  return collection.map((message) => formatMessage(message)).slice(1).filter((
    text,
  ) => text !== undefined);
};

const parseMessageText = (message: string, client: Client) => {
    // Gemini sometimes sends a response in the same format as we send it in
    if (message.startsWith(`<@${client.user?.id}>: `)) {
      return message.slice(`<@${client.user?.id}>: `.length);
    }

    return message;
}

async function standardResponse(message: Message<true>, client: Client) {
  const formattedMessage = formatMessage(message, true);

  if (!formattedMessage) return;

  console.info(`[INFO] Recieved message "${formattedMessage}".`);

  await message.channel.sendTyping();

  const recentHistory = await message.channel.messages.fetch({
    limit: HISTORY_LENGTH,
  });

  const response = await generateText(formattedMessage, {
    characterLimit: DISCORD_MESSAGE_LIMIT,
    instructions: standardInstructions(client.user?.id).trim(),
    context: formatMessageCollection(recentHistory),
  });

  return message.reply(parseMessageText(response, client));
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

    console.info(
      `[INFO] Proactively considering a response to message "${formattedMessage}".`,
    );

    const recentHistory = await message.channel.messages.fetch({
      limit: HISTORY_LENGTH,
    });

    const response = await generateText(formattedMessage, {
      characterLimit: DISCORD_MESSAGE_LIMIT,
      instructions: proactiveInstructions(client.user?.id).trim(),
      context: formatMessageCollection(recentHistory),
    });

    if (response === ignoreMarker) {
      console.info(
        `[INFO] Decided against responding to message "${formattedMessage}".`,
      );
      return;
    }

    return message.reply(parseMessageText(response, client));
  },
  mount(client) {
    console.info(
      `[INFO] @Bott running at id <@${client?.user?.id ?? "unknown"}>`,
    );
  },
});

// need to respond to GCP health probe
Deno.serve(
  { port: Number(Deno.env.get("PORT") ?? 8080) },
  () => new Response("OK", { status: 200 }),
);
