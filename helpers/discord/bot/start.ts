import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  type Message,
  REST,
  Routes,
  SlashCommandBuilder,
} from "npm:discord.js";
import { createErrorEmbed } from "../message/embed/error.ts";
import { type CommandObject, CommandOptionType } from "./types.ts";

import { type BottEvent, EventType } from "@bott/data";

const defaultIntents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
];

type Bot = {
  id: string;
  send: (text: string) => BottEvent;
  sendTyping: () => void;
  wpm: number;
};

type BotOptions = {
  identityToken: string;
  mount?: (this: Bot) => void;
  commands?: Record<string, CommandObject>;
  event?: (this: Bot, event: BottEvent) => void;
  intents?: GatewayIntentBits[];
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

  // TODO: hydrate DB if not exist

  // this is the bot user object
  if (!client.user) {
    throw new Error("Bot user is not set");
  }

  const self = {
    id: client.user.id,
    // TODO:
    send: (text: string) => {
      return {} as BottEvent;
    },
    sendTyping: () => {},
    wpm: 200,
  };

  handleMount?.call(self);

  client.on(Events.MessageCreate, async (message) => {
    if (message.channel.type !== ChannelType.GuildText) {
      return;
    }

    let eventType = EventType.MESSAGE;
    let parentEvent: BottEvent | undefined;

    if (message.reference && message.reference.messageId) {
      eventType = EventType.REPLY;
      try {
        parentEvent = messageToBaseEvent(
          await message.channel.messages.fetch(message.reference.messageId),
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

    handleEvent?.call(self, event);
  });

  client.on(Events.MessageReactionAdd, (reaction) => {
    if (reaction.message.channel.type !== ChannelType.GuildText) {
      return;
    }
    const event: BottEvent = {
      // TODO: The 'id' for a reaction event should likely be unique and not the reacted message's ID,
      // especially if 'events.id' is a primary key. This needs to be addressed for data integrity.
      id: Number(reaction.message.id),
      type: EventType.REACTION,
      data: new TextEncoder().encode(reaction.emoji.toString()),
      timestamp: new Date(),
      channel: {
        id: Number(reaction.message.channel.id),
        name: reaction.message.channel.name,
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

    handleEvent?.call(self, event);
  });

  if (!commands) {
    return;
  }

  // delegate commands
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

  // sync commands with discord origin via their custom http client 🙄
  const body = [];
  for (const [commandName, commandObject] of Object.entries(commands)) {
    body.push(getCommandJson(commandName, commandObject));
  }

  await new REST({ version: "10" }).setToken(token).put(
    Routes.applicationCommands(self.id),
    { body },
  );
}

const messageToBaseEvent = (message: Message<true>): BottEvent => {
  const event: BottEvent = {
    id: Number(message.id),
    type: EventType.MESSAGE,
    data: new TextEncoder().encode(message.content),
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
