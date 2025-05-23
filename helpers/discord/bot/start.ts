import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  type GuildTextBasedChannel,
  type Message,
  REST,
  Routes,
  SlashCommandBuilder,
} from "npm:discord.js";
import { createErrorEmbed } from "../message/embed/error.ts";
import {
  type BotContext,
  type CommandObject,
  CommandOptionType,
} from "./types.ts";
import { TaskManager } from "./task/manager.ts";

import { addEvents, type BottEvent, BottEventType } from "@bott/data";

const defaultIntents = [
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.MessageContent,
];

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
          events.push(await messageToEvent(message));
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

  handleMount?.call(makeSelf());

  client.on(Events.MessageCreate, async (message) => {
    const currentChannel = message.channel;

    if (currentChannel.type !== ChannelType.GuildText) {
      return;
    }

    const event: BottEvent = await messageToEvent(message as Message<true>);

    console.log(
      "[DEBUG] Message event:",
      { id: event.id, preview: event.details?.content.slice(0, 100) },
    );

    handleEvent?.call(makeSelf(currentChannel), event);
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
      event.parent = await messageToEvent(
        reaction.message as Message<true>,
      );
    }

    console.debug("[DEBUG] Reaction event:", {
      id: event.id,
      details: event.details,
    });

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
      await commands[interaction.commandName]?.command.call(
        makeSelf(interaction.channel! as GuildTextBasedChannel),
        interaction,
      );
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

const messageToEvent = async (
  message: Message<true>,
): Promise<BottEvent> => {
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

  if (message.reference?.messageId) {
    event.type = BottEventType.REPLY;

    let parentMessage: BottEvent | undefined;

    try {
      parentMessage = await messageToEvent(
        await message.channel.messages.fetch(
          message.reference.messageId,
        ),
      );
    } catch (_) {
      // If the parent message isn't available, we can't populate the parent event.
      // This can happen if the parent message was deleted or is otherwise inaccessible.
      // In this case, we'll just omit the parent event.
    }

    event.parent = parentMessage;
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
