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
  addEvents,
  type BottChannel,
  type BottEvent,
  BottEventType,
  type BottSpace,
  type BottUser,
} from "@bott/data";

const defaultIntents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
];

type BotContext = {
  user: BottUser;
  send: (
    event: BottEvent,
  ) => Promise<Message<true> | MessageReaction | undefined>;
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
    user: {
      id: client.user.id,
      name: client.user.username,
    },
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

  client.once(Events.ClientReady, async () => {
    // Attempt to hydrate the DB.
    const spaceIndex = new Map<string, BottSpace>();
    const userIndex = new Map<string, BottUser>();
    const channelIndex = new Map<string, BottChannel>();
    const events: BottEvent[] = [];

    // Discord "guilds" are equivalent to Bott's "spaces":
    for (const space of client.guilds.cache.values()) {
      try {
        // Add space:
        const spaceObject = {
          id: space.id,
          name: space.name,
          description: space.description ?? undefined,
        };
        spaceIndex.set(space.id, spaceObject);

        // Add users:
        await space.members.fetch();
        for (
          const { user: { id, username } } of space.members.cache.values()
        ) {
          userIndex.set(id, { id, name: username });
        }

        // Add channels:
        for (const channel of space.channels.cache.values()) {
          if (channel.type !== ChannelType.GuildText) {
            continue;
          }
          try {
            channelIndex.set(channel.id, {
              id: channel.id,
              name: channel.name,
              description: channel.topic ?? undefined,
              space: spaceObject,
            });

            // Add events:
            const messages = await channel.messages.fetch();
            for (const message of messages.values()) {
              const baseEvent = messageToBaseEvent(message as Message<true>);
              if (message.reference?.messageId) {
                baseEvent.type = BottEventType.REPLY;
                baseEvent.parent = {
                  id: message.reference.messageId,
                } as BottEvent;
              }
              events.push(baseEvent);
            }
          } catch (_) {
            // Continue to the next channel
          }
        }
      } catch (_) {
        // Continue to the next guild
      }
    }

    const result = addEvents(...events);

    if ("error" in result) {
      console.error("[ERROR] Failed to hydrate database:", result.error);
    }

    handleMount?.call(makeSelf());
  });

  client.on(Events.MessageCreate, async (message) => {
    const currentChannel = message.channel;

    if (currentChannel.type !== ChannelType.GuildText) {
      return;
    }

    let eventType = BottEventType.MESSAGE;
    let parentEvent: BottEvent | undefined;

    if (message.reference && message.reference.messageId) {
      eventType = BottEventType.REPLY;
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
    Routes.applicationCommands(String(baseSelf.user.id)),
    { body },
  );
}

const messageToBaseEvent = (message: Message<true>): BottEvent => {
  const event: BottEvent = {
    id: message.id,
    type: BottEventType.MESSAGE,
    details: {
      content: (message.content || message.embeds.at(0)?.description) ??
        "NO CONTENT",
    },
    timestamp: new Date(message.createdTimestamp),
    channel: {
      id: message.channel.id,
      name: message.channel.name,
      space: {
        id: message.guild?.id,
        name: message.guild?.name,
      },
    },
  };

  if (message.author) {
    event.user = {
      id: message.author.id,
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
