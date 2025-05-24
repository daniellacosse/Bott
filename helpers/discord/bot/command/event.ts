import { type BottChannel, BottEventType } from "@bott/data";
import {
  ApplicationCommandOptionType,
  ChannelType,
  type ChatInputCommandInteraction,
  type CommandInteractionOption,
  type GuildTextBasedChannel,
} from "npm:discord.js";
import type { CommandEvent } from "./create.ts";

export function getCommandBottEvent<O extends Record<string, unknown> = {}>(
  interaction: ChatInputCommandInteraction,
): CommandEvent<O> {
  let channel: BottChannel | undefined = undefined;

  if (
    interaction.channel && interaction.channel.type === ChannelType.GuildText
  ) {
    const _channel = interaction.channel as GuildTextBasedChannel;
    const _space = interaction.guild!;

    channel = {
      id: _channel.id,
      name: _channel.name,
      space: {
        id: _space.id,
        name: _space.name,
      },
    };
  }

  const event = {
    id: crypto.randomUUID(),
    type: BottEventType.REQUEST as const,
    details: {
      name: interaction.commandName,
      options: extractResolvedOptions(
        interaction,
        interaction.options.data,
      ) as O,
    },
    user: {
      id: interaction.user.id,
      name: interaction.user.username,
    },
    channel,
    timestamp: new Date(),
  };

  return event;
}

function extractResolvedOptions(
  interaction: ChatInputCommandInteraction,
  optionList: readonly CommandInteractionOption[],
): Record<string, unknown> {
  const options: Record<string, unknown> = {};

  for (const opt of optionList) {
    switch (opt.type) {
      case ApplicationCommandOptionType.SubcommandGroup:
      case ApplicationCommandOptionType.Subcommand:
        if (opt.options) {
          // Recursively merge options from subcommands.
          // This flattens all options into a single map.
          Object.assign(
            options,
            extractResolvedOptions(interaction, opt.options),
          );
        }
        break;
      case ApplicationCommandOptionType.String:
        options[opt.name] = interaction.options.getString(opt.name);
        break;
      case ApplicationCommandOptionType.Integer:
        options[opt.name] = interaction.options.getInteger(opt.name);
        break;
      case ApplicationCommandOptionType.Boolean:
        options[opt.name] = interaction.options.getBoolean(opt.name);
        break;
      case ApplicationCommandOptionType.User:
        options[opt.name] = interaction.options.getUser(opt.name);
        break;
      case ApplicationCommandOptionType.Channel:
        options[opt.name] = interaction.options.getChannel(opt.name);
        break;
      case ApplicationCommandOptionType.Role:
        options[opt.name] = interaction.options.getRole(opt.name);
        break;
      case ApplicationCommandOptionType.Mentionable:
        options[opt.name] = interaction.options.getMentionable(opt.name);
        break;
      case ApplicationCommandOptionType.Number:
        options[opt.name] = interaction.options.getNumber(opt.name);
        break;
      case ApplicationCommandOptionType.Attachment:
        options[opt.name] = interaction.options.getAttachment(opt.name);
        break;
    }
  }
  return options;
}
