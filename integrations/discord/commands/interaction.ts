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

import type { BottChannel } from "@bott/model";
import BottSystem, {
  type BottActionCallEvent,
  type BottActionParameterRecord,
  BottEventType,
} from "@bott/system";
import {
  ApplicationCommandOptionType,
  ChannelType,
  type ChatInputCommandInteraction,
  type GuildTextBasedChannel,
} from "discord.js";

export async function commandInteractionToActionCallEvent(
  interaction: ChatInputCommandInteraction,
): Promise<BottActionCallEvent> {
  let channel: BottChannel | undefined = undefined;

  if (
    interaction.channel && interaction.channel.type === ChannelType.GuildText
  ) {
    const actionChannel = interaction.channel as GuildTextBasedChannel;
    const actionSpace = interaction.guild!;

    channel = {
      id: actionChannel.id,
      name: actionChannel.name,
      space: {
        id: actionSpace.id,
        name: actionSpace.name,
      },
    };
  }

  return BottSystem.Events.create(BottEventType.ACTION_CALL, {
    detail: {
      name: interaction.commandName,
      parameters: await extractResolvedOptions(
        interaction,
      ),
    },
    user: {
      name: interaction.user.username,
      id: interaction.user.id,
    },
    channel,
  }) as BottActionCallEvent;
}

async function extractResolvedOptions(
  interaction: ChatInputCommandInteraction,
): Promise<BottActionParameterRecord> {
  const parameters: BottActionParameterRecord = {};

  for (const option of interaction.options.data) {
    switch (option.type) {
      case ApplicationCommandOptionType.String:
      case ApplicationCommandOptionType.Integer:
      case ApplicationCommandOptionType.Boolean:
      case ApplicationCommandOptionType.Number:
        if (option.value !== undefined) {
          parameters[option.name] = option.value;
        }
        break;
      case ApplicationCommandOptionType.Attachment:
        {
          const attachment = interaction.options.getAttachment(option.name);
          if (attachment) {
            const response = await fetch(attachment.url);
            const blob = await response.blob();
            const file = new File([blob], attachment.name, {
              type: attachment.contentType ?? undefined,
            });

            parameters[option.name] = file;
          }
        }
        break;
    }
  }
  return parameters;
}
