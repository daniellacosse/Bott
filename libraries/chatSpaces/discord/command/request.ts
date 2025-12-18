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
  type BottActionCallEvent,
  type BottActionParameterEntry,
  type BottChannel,
  BottEventType,
  type BottService,
} from "@bott/model";
import { BottEvent } from "@bott/service";
import {
  ApplicationCommandOptionType,
  ChannelType,
  type ChatInputCommandInteraction,
  type CommandInteractionOption,
  type GuildTextBasedChannel,
} from "discord.js";

export async function resolveCommandRequestEvent(
  interaction: ChatInputCommandInteraction,
  service: BottService,
): Promise<BottActionCallEvent> {
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

  return new BottEvent(BottEventType.ACTION_CALL, {
    detail: {
      id: crypto.randomUUID(),
      name: interaction.commandName,
      parameters: await extractResolvedOptions(
        interaction,
        interaction.options.data,
      ),
    },
    user: service.user,
    channel,
  }) as BottActionCallEvent;
}

async function extractResolvedOptions(
  interaction: ChatInputCommandInteraction,
  optionList: readonly CommandInteractionOption[],
): Promise<BottActionParameterEntry[]> {
  const options: BottActionParameterEntry[] = [];

  for (const opt of optionList) {
    switch (opt.type) {
      case ApplicationCommandOptionType.SubcommandGroup:
      case ApplicationCommandOptionType.Subcommand:
        if (opt.options) {
          options.push(
            ...(await extractResolvedOptions(interaction, opt.options)),
          );
        }
        break;
      case ApplicationCommandOptionType.String:
        {
          const value = interaction.options.getString(opt.name);
          if (value !== null) {
            options.push({ name: opt.name, value });
          }
        }
        break;
      case ApplicationCommandOptionType.Integer:
        {
          const value = interaction.options.getInteger(opt.name);
          if (value !== null) {
            options.push({ name: opt.name, value });
          }
        }
        break;
      case ApplicationCommandOptionType.Boolean:
        {
          const value = interaction.options.getBoolean(opt.name);
          if (value !== null) {
            options.push({ name: opt.name, value });
          }
        }
        break;
      case ApplicationCommandOptionType.Number:
        {
          const value = interaction.options.getNumber(opt.name);
          if (value !== null) {
            options.push({ name: opt.name, value });
          }
        }
        break;
      case ApplicationCommandOptionType.Attachment:
        {
          const attachment = interaction.options.getAttachment(opt.name);
          if (attachment !== null) {
            const response = await fetch(attachment.url);
            const blob = await response.blob();
            const file = new File([blob], attachment.name, {
              type: attachment.contentType ?? undefined,
            });

            options.push({ name: opt.name, value: file });
          }
        }
        break;
    }
  }
  return options;
}
