// TODO(#16): encapsulate these concepts in infra
import {
AttachmentBuilder,
  ChannelType,
  Client,
  Collection,
  Message,
  TextChannel,
} from "npm:discord.js";
// TODO: encapsulate these concepts in infra
import { Chat, Content } from "npm:@google/genai";
import { Buffer } from "node:buffer";
import { setTimeout as sleep } from "node:timers/promises";

import { startBot } from "@bott/discord";
import { createChat, messageChat } from "@bott/gemini";

import { DISCORD_MESSAGE_LIMIT, HISTORY_LENGTH } from "./constants.ts";
import { standardInstructions } from "./instructions/main.ts";
import commands from "./commands/main.ts";
import { noResponseMarker } from "./instructions/markers.ts";

const formatMessage = (message: Message, client: Client): Content | undefined => {
  const content = message.content.trim();

  if (!content) return undefined;

  return {
    parts: [{ text: `<@${message.author.id}>: ${content}` }],
    role: message.author.id === client.user?.id ? "model" : "user",
  }
};

const formatMessageHistory = (
  collection: Collection<string, Message>,
  client: Client,
): Content[] => {
  const orderedMessages = Array.from(collection.values()).reverse();

  const history: Content[] = orderedMessages
    .map((message) => formatMessage(message, client))
    .filter((content): content is Content => content !== undefined);

  // Chat histories require that we send in reverse order, starting with a user message
  const firstUserIndex = history.findIndex((content) => content.role === "user");

  if (firstUserIndex === -1) {
    return [];
  }

  return history.slice(firstUserIndex);
};

const parseMessageText = (message: string, client: Client) => {
  // Gemini sometimes sends a response in the same format as we send it in
  if (message.startsWith(`<@${client.user?.id}>: `)) {
    return message.slice(`<@${client.user?.id}>: `.length);
  }

  return message;
};

const channelMap = new Map<string, { chat: Chat }>();

startBot({
  commands,
  identityToken: Deno.env.get("DISCORD_TOKEN")!,
  async message(message, client) {
    const formattedMessage = formatMessage(message, client);

    if (!formattedMessage) return;

    console.info(`[INFO] Recieved message "${formattedMessage}".`);

    let chat: Chat;
    const channelId = message.channel.id;

    if (channelMap.has(channelId)) {
      chat = channelMap.get(channelId)!.chat;
    } else {
      const recentHistory = await message.channel.messages.fetch({
        limit: HISTORY_LENGTH,
      });

      let channelName = "DM";
      let channelTopic = "Direct Message";

      if (message.channel.type === ChannelType.GuildText) {
        const textChannel = message.channel as TextChannel;
        channelName = textChannel.name;
        channelTopic = textChannel.topic ?? "No topic set";
      } else if ("name" in message.channel && message.channel.name) {
        channelName = message.channel.name;
        channelTopic = "N/A";
      }

      chat = createChat(
        formatMessageHistory(recentHistory, client),
        {
          instructions: standardInstructions(
            client.user!.id,
            channelName,
            channelTopic,
          ),
        },
      );
      channelMap.set(channelId, { chat });
    }

    const response = await messageChat(
      formattedMessage.parts![0].text as string,
      channelMap.get(message.channel.id)!.chat,
    );

    const parsedResponse = parseMessageText(response, client);

    if (parsedResponse === noResponseMarker) {
      return;
    }

    // Split the response into parts based on one or more newlines
    const messageParts = parsedResponse.split(/\n+/).filter(part => part.trim().length > 0);

    if (messageParts.length === 0) {
      return;
    }

    const wordsPerMinute = 60;
    const canSendTyping = "sendTyping" in message.channel;
    const canSend = "send" in message.channel;

    for (const [index, part] of messageParts.entries()) {
      if (canSendTyping) {
        await message.channel.sendTyping();
      }

      const words = part.split(/\s+/).length;
      const delayMs = Math.max(500, (words / wordsPerMinute) * 60 * 1000);
      const cappedDelayMs = Math.min(delayMs, 7000);
      await sleep(cappedDelayMs);

      let file: AttachmentBuilder | undefined;
      if (part.length > DISCORD_MESSAGE_LIMIT) {
        file = new AttachmentBuilder(Buffer.from(part), { name: `response_part_${index + 1}.txt` });
      }
      const payload = file ? { files: [file] } : part;

      if (canSend){
        await message.channel.send(payload);
      } else {
        await message.reply(payload);
      }
    }

    return message; // Return the original message after attempting to send all parts
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
