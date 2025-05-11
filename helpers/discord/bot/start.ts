import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  type GuildTextBasedChannel,
  type Message,
  type MessageReaction,
  REST,
  Routes,
  SlashCommandBuilder,
} from "npm:discord.js";
import { createErrorEmbed } from "../message/embed/error.ts";
import { type CommandObject, CommandOptionType } from "./types.ts";

import { SwapTaskQueue } from "./task/queue.ts";
import {
  addChannels,
  addEvents,
  addUsers,
  type BottChannel,
  type BottEvent,
  type BottUser,
  EventType,
} from "@bott/data";
import { promises } from "node:dns";

const defaultIntents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
];

type BotContext = {
  id: string;
  send: (event: BottEvent) => Promise<Message<true> | MessageReaction | undefined>;
  startTyping: () => Promise<void>;
  tasks: SwapTaskQueue;
  wpm: number;
};

type BotOptions = {
  commands?: Record<string, CommandObject>;
  event?: (this: BotContext, event: BottEvent) => void;
  identityToken: string;
  intents?: GatewayIntentBits[];
  mount?: (this: BotContext) => void;
};

export async function startBot({
  identityToken: token,
  commands,
  intents = defaultIntents,
  event: handleEvent,
  mount: handleMount,
}: BotOptions) {
  const client = new Client({ intents });

  await client.login(token);

  // this is the bot user object
  if (!client.user) {
    throw new Error("Bot user is not set");
  }

  const baseSelf = {
    id: client.user.id,
    tasks: new SwapTaskQueue(),
    wpm: 200,
  };

  const makeSelf = (currentChannel?: GuildTextBasedChannel) => ({
    ...baseSelf,
    startTyping: () => {
      if (!currentChannel) return Promise.resolve();

      return currentChannel.sendTyping();
    },
    send: async (event: BottEvent) => {
      if (!currentChannel) return;

      switch (event.type) {
        case EventType.MESSAGE:
          return currentChannel.send(event.details.content);
        case EventType.REPLY: {
          const message = await currentChannel.messages.fetch(String(event.parent!.id));
          return message.reply(event.details.content);
        }
        case EventType.REACTION: {
          const message = await currentChannel.messages.fetch(String(event.parent!.id));
          return message.react(event.details.content);
        }
      }
    },
  });

  client.once(Events.ClientReady, async () => {
    try {
      const userIndex = new Map<string, BottUser>();
      const channelIndex = new Map<string, BottChannel>();
      const events: BottEvent[] = [];

      // Discord "guilds" are equivalent to Bott's "spaces":
      for (const space of client.guilds.cache.values()) {
        // Add users:
        await space.members.fetch();
        for (const { user: { id, username } } of space.members.cache.values()) {
          userIndex.set(id, { id: Number(id), name: username });
        }

        // Add channels:
        for (const channel of space.channels.cache.values()) {
          if (channel.type !== ChannelType.GuildText) {
            continue;
          }

          channelIndex.set(channel.id, {
            id: Number(channel.id),
            name: channel.name,
            description: channel.topic ?? undefined,
          });

          // Add events:
          const messages = await channel.messages.fetch();
          for (const message of messages.values()) {
            const baseEvent = messageToBaseEvent(message as Message<true>);
            if (message.reference?.messageId) {
              baseEvent.type = EventType.REPLY;
              baseEvent.parent = {
                id: Number(message.reference.messageId),
              } as BottEvent;
            }
            events.push(baseEvent);
          }
        }
      }

      addUsers(...userIndex.values());
      addChannels(...channelIndex.values());
      addEvents(
        ...events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      );
    } catch (error) {
      console.error("[ERROR] Database hydration failed:", error);
    }

    handleMount?.call(makeSelf());
  });

  client.on(Events.MessageCreate, async (message) => {
    const currentChannel = message.channel;

    if (currentChannel.type !== ChannelType.GuildText) {
      return;
    }

    let eventType = EventType.MESSAGE;
    let parentEvent: BottEvent | undefined;

    if (message.reference && message.reference.messageId) {
      eventType = EventType.REPLY;
      try {
        parentEvent = messageToBaseEvent(
          await currentChannel.messages.fetch(message.reference.messageId),
        );
      } catch (error) {
        console.error(
          `Failed to fetch replied-to message (ID: ${message.reference.messageId}):`,
          error,
        );
      }
    }

    const event: BottEvent = {
      ...messageToBaseEvent(message as Message<true>),
      type: eventType,
      parent: parentEvent,
    };

    handleEvent?.call(makeSelf(currentChannel), event);
  });

  client.on(Events.MessageReactionAdd, (reaction) => {
    const currentChannel = reaction.message.channel;

    if (currentChannel.type !== ChannelType.GuildText) {
      return;
    }

    const event: BottEvent = {
      // It's okay if we lose reaction data
      id: Math.round(Math.random() * Number.MAX_SAFE_INTEGER),
      type: EventType.REACTION,
      details: { content: reaction.emoji.toString() },
      timestamp: new Date(),
      channel: {
        id: Number(currentChannel.id),
        name: currentChannel.name,
      },
    };

    const reactor = reaction.users.cache.first();
    if (reactor) {
      event.user = {
        id: Number(reactor.id),
        name: reactor.username,
      };
    }

    if (reaction.message.content) {
      event.parent = messageToBaseEvent(reaction.message as Message<true>);
    }

    handleEvent?.call(makeSelf(currentChannel), event);
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

    try {
      await commands[interaction.commandName]?.command(interaction);
    } catch (error) {
      await interaction.editReply({
        embeds: [createErrorEmbed(error as Error)],
      });
    }
  });

  // Sync commands with discord origin via their custom http client 🙄
  const body = [];
  for (const [commandName, commandObject] of Object.entries(commands)) {
    body.push(getCommandJson(commandName, commandObject));
  }

  await new REST({ version: "10" }).setToken(token).put(
    Routes.applicationCommands(baseSelf.id),
    { body },
  );
}

const messageToBaseEvent = (message: Message<true>): BottEvent => {
  const event: BottEvent = {
    id: Number(message.id),
    type: EventType.MESSAGE,
    details: { content: message.content },
    timestamp: new Date(message.createdTimestamp),
    channel: {
      id: Number(message.channel.id),
      name: message.channel.name,
    },
  };

  if (message.author) {
    event.user = {
      id: Number(message.author.id),
      name: message.author.username,
    };
  }

  return event;
};

const DISCORD_DESCRIPTION_LIMIT = 100;
function getCommandJson(name: string, {
  description,
  options,
}: CommandObject) {
  const builder = new SlashCommandBuilder().setName(name);

  if (description) {
    builder.setDescription(description.slice(0, DISCORD_DESCRIPTION_LIMIT));
  }

  if (options && options.length) {
    for (const { name, description, type, required } of options) {
      const buildOption = (option: any) => {
        if (name) {
          option.setName(name);
        }

        if (description) {
          option.setDescription(description);
        }

        if (required) {
          option.setRequired(required);
        }

        return option;
      };

      switch (type) {
        case CommandOptionType.STRING:
          builder.addStringOption(buildOption);
          break;
        case CommandOptionType.INTEGER:
          builder.addIntegerOption(buildOption);
          break;
        case CommandOptionType.BOOLEAN:
          builder.addBooleanOption(buildOption);
          break;
      }
    }
  }

  return builder.toJSON();
}
