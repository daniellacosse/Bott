import { Buffer } from "node:buffer";
import {
  AttachmentBuilder,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  type GuildTextBasedChannel,
  type Message,
  type MessageReaction,
  REST,
  Routes,
} from "npm:discord.js";

import { addEvents, type BottEvent, BottEventType } from "@bott/data";

import { TaskManager } from "./task/manager.ts";
import { createErrorEmbed } from "../embed/error.ts";
import { command2Json } from "./event/command.ts";
import { message2BottEvent } from "./event/message.ts";

type BotOptions = {
  commands?: Command[];
  event?: (this: BotContext, event: BottEvent) => void;
  identityToken: string;
  intents?: GatewayIntentBits[];
  mount?: (this: BotContext) => void;
};

type BotContext = {
  user: BottUser;
  send: (
    event: BottEvent,
  ) => Promise<Message<true> | MessageReaction | undefined>;
  startTyping: () => Promise<void>;
  taskManager: TaskManager;
  wpm: number;
};

export async function startBot({
  identityToken: token,
  commands,
  intents = [
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
  ],
  event: handleEvent,
  mount: handleMount,
}: BotOptions) {
  const client = new Client({ intents });

  await client.login(token);
  console.debug("[DEBUG] Logged in.");

  // this is the bot user object
  if (!client.user) {
    throw new Error("Bot user is not set!");
  }

  const baseSelf = {
    user: {
      id: client.user.id,
      name: client.user.username,
    },
    taskManager: new TaskManager(),
    wpm: 200,
  };

  const _makeSelf = (currentChannel?: GuildTextBasedChannel) => ({
    ...baseSelf,
    startTyping: () => {
      if (!currentChannel) return Promise.resolve();

      return currentChannel.sendTyping();
    },
    send: async (event: BottEvent) => {
      if (!currentChannel) return;

      switch (event.type) {
        case BottEventType.MESSAGE:
          return currentChannel.send(event.details.content);
        case BottEventType.REPLY: {
          const message = await currentChannel.messages.fetch(
            String(event.parent!.id),
          );
          return message.reply(event.details.content);
        }
        case BottEventType.REACTION: {
          const message = await currentChannel.messages.fetch(
            String(event.parent!.id),
          );
          return message.react(event.details.content);
        }
        default:
          return;
      }
    },
  });

  // Attempt to hydrate the DB.
  const events: BottEvent[] = [];

  // Discord "guilds" are equivalent to Bott's "spaces":
  for (const space of client.guilds.cache.values()) {
    for (const channel of space.channels.cache.values()) {
      if (channel.type !== ChannelType.GuildText) {
        continue;
      }

      try {
        for (const [_, message] of await channel.messages.fetch()) {
          events.push(await message2Event(message));
        }
      } catch (_) {
        // Likely don't have access to this channel
      }
    }
  }

  const result = addEvents(...events);

  if ("error" in result) {
    console.error("[ERROR] Failed to hydrate database:", result.error);
  }

  handleMount?.call(_makeSelf());

  client.on(Events.MessageCreate, async (message) => {
    const currentChannel = message.channel;

    if (currentChannel.type !== ChannelType.GuildText) {
      return;
    }

    const event: BottEvent = await message2BottEvent(message as Message<true>);

    console.log(
      "[DEBUG] Message event:",
      { id: event.id, preview: event.details?.content.slice(0, 100) },
    );

    handleEvent?.call(_makeSelf(currentChannel), event);
  });

  client.on(Events.MessageReactionAdd, async (reaction) => {
    const currentChannel = reaction.message.channel;

    if (currentChannel.type !== ChannelType.GuildText) {
      return;
    }

    const event: BottEvent = {
      id: crypto.randomUUID(),
      type: BottEventType.REACTION,
      details: { content: reaction.emoji.toString() },
      timestamp: new Date(),
      channel: {
        id: currentChannel.id,
        name: currentChannel.name,
        space: {
          id: currentChannel.guild.id,
          name: currentChannel.guild.name,
        },
      },
    };

    const reactor = reaction.users.cache.first();
    if (reactor) {
      event.user = {
        id: reactor.id,
        name: reactor.username,
      };
    }

    if (reaction.message.content) {
      event.parent = await message2BottEvent(
        reaction.message as Message<true>,
      );
    }

    console.debug("[DEBUG] Reaction event:", {
      id: event.id,
      details: event.details,
    });

    handleEvent?.call(_makeSelf(currentChannel), event);
  });

  // Handle commands, if they exist
  if (!commands) {
    return;
  }

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    await interaction.deferReply();

    let responseEvent;

    try {
      responseEvent = await commands[interaction.commandName]?.command.call(
        _makeSelf(interaction.channel! as GuildTextBasedChannel),
        await commandToEvent(interaction),
      );
    } catch (error) {
      await interaction.editReply({
        embeds: [createErrorEmbed(error as Error)],
      });
    }

    interaction.followUp({
      content: responseEvent?.details.content,
      files: (responseEvent?.files || []).map((file) =>
        new AttachmentBuilder(Buffer.from(file.data))
      ),
    });
  });

  // Sync commands with discord origin via their custom http client 🙄
  const body = [];
  for (const command of commands) {
    body.push(command2Json(command));
  }

  await new REST({ version: "10" }).setToken(token).put(
    Routes.applicationCommands(String(baseSelf.user.id)),
    { body },
  );
}
