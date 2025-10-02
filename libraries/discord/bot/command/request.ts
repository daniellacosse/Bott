/**
 * @license
 * This file is part of Bott.
 *
 * This project is dual-licensed:
 * - Non-commercial use: AGPLv3 (see LICENSE file for full text).
 * - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
 *
 * Copyright (C) 2025 DanielLaCos.se
 */

import {
  type BottChannel,
  BottEventType,
  type BottRequestEvent,
} from "@bott/model";
import { addEventData } from "@bott/storage";
import {
  ApplicationCommandOptionType,
  ChannelType,
  type ChatInputCommandInteraction,
  type CommandInteractionOption,
  type GuildTextBasedChannel,
} from "npm:discord.js";
import { log } from "@bott/logger";

export function resolveCommandRequestEvent<
  O extends Record<string, unknown> = Record<string, unknown>,
>(
  interaction: ChatInputCommandInteraction,
): BottRequestEvent<O> {
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

  // Try to get display name from guild member
  let displayName = interaction.user.username;
  if (interaction.guild) {
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      displayName = member.displayName;
    } catch {
      // Use username as fallback
    }
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
      displayName,
    },
    channel,
    timestamp: new Date(),
  };

  const result = addEventData(event);
  if ("error" in result) {
    log.error(
      "Failed to resolve request event to database:",
      result.error,
    );
  }

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
