import {
  Client,
  Events,
  GatewayIntentBits,
  type Message,
  REST,
  Routes,
  SlashCommandBuilder,
} from "npm:discord.js";
import { classifyMessage, MessageClass } from "../message/classify.ts";
import { createErrorEmbed } from "../message/embed/error.ts";
import { type CommandObject, CommandOptionType } from "./types.ts";

const defaultIntents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
];

type BotChannelResponder = (
  message: Message<true>,
  client: Client,
) => Promise<Message<true> | undefined>;

type BotOptions = {
  identityToken: string;
  mount?: (client?: Client) => void;
  commands?: Record<string, CommandObject>;
  channelMessage?: BotChannelResponder;
  channelReply?: BotChannelResponder;
  channelMention?: BotChannelResponder;
  intents?: GatewayIntentBits[];
};

// TODO(#1): rate limiting by channel
export async function startBot({
  identityToken: token,
  commands,
  channelMessage,
  channelReply,
  channelMention,
  intents = defaultIntents,
  mount: handleMount,
}: BotOptions): Promise<Client> {
  const client = new Client({ intents });

  await client.login(token);

  // this is the bot user object
  if (!client.user) {
    throw new Error("Bot user is not set");
  }

  const botId = client.user.id;

  handleMount?.(client);

  // delegate messages
  client.on(Events.MessageCreate, async (message) => {
    try {
      const messageClass = await classifyMessage(message, botId);

      if (messageClass === MessageClass.MENTION) {
        return channelMention?.(message as Message<true>, client);
      }

      if (messageClass === MessageClass.REPLY) {
        return channelReply?.(message as Message<true>, client);
      }

      if (messageClass === MessageClass.USER) {
        return channelMessage?.(message as Message<true>, client);
      }
    } catch (error) {
      await message.reply({ embeds: [createErrorEmbed(error as Error)] });
    }
  });

  if (!commands) {
    return client;
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
    Routes.applicationCommands(botId),
    { body },
  );

  return client;
}

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
