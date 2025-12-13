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
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  type GuildTextBasedChannel,
  type Message,
  REST,
  Routes,
} from "discord.js";

import {
  type AnyShape,
  type BottAction,
  type BottActionResultEvent,
  BottEvent,
  BottEventType,
  type BottUser,
} from "@bott/model";

import { createErrorEmbed } from "../message/embed/error.ts";
import { resolveBottEventFromMessage } from "../message/event.ts";
import { resolveCommandRequestEvent } from "./command/request.ts";
import { getCommandJson } from "./command/json.ts";
import type { DiscordBotContext } from "./context.ts";
import { resolveCommandResponseEvent } from "./command/response.ts";
import { callWithContext } from "./context.ts";
import { log } from "@bott/logger";

const REQUIRED_INTENTS = [
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.MessageContent,
];

type DiscordBotOptions<
  O extends Record<string, unknown> = Record<string, unknown>,
> = {
  actions?: Record<string, BottAction<O, AnyShape>>;
  event?: (this: DiscordBotContext, event: BottEvent) => void;
  identityToken: string;
  mount?: (this: DiscordBotContext) => void;
};

export async function startDiscordBot<
  O extends Record<string, unknown> = Record<string, unknown>,
>({
  identityToken: token,
  actions: commands,
  event: handleEvent,
  mount: handleMount,
}: DiscordBotOptions<O>) {
  const client = new Client({ intents: REQUIRED_INTENTS });

  await client.login(token);
  log.debug("Logged in.");

  // This is the Bott user object.
  if (!client.user) {
    throw new Error("Bot user is not set!");
  }

  // Attempt to hydrate the DB.
  (async () => {
    // Discord "guilds" are equivalent to Bott's "spaces":
    for (const space of client.guilds.cache.values()) {
      for (const channel of space.channels.cache.values()) {
        if (channel.type !== ChannelType.GuildText) {
          continue;
        }

        try {
          for (const [_, message] of await channel.messages.fetch()) {
            await resolveBottEventFromMessage(message);
          }
        } catch (_) {
          // Likely don't have access to this channel
        }
      }
    }
  })();

  if (handleMount) {
    callWithContext(handleMount, { client });
  }

  client.on(Events.MessageCreate, async (message) => {
    const currentChannel = message.channel;

    if (currentChannel.type !== ChannelType.GuildText) {
      return;
    }

    const event = (await resolveBottEventFromMessage(
      message as Message<true>,
    )) as BottEvent;

    if (handleEvent) {
      callWithContext(handleEvent, {
        client,
        channel: currentChannel,
        arguments: [event],
      });
    }
  });

  client.on(Events.MessageReactionAdd, async (reaction) => {
    const currentChannel = reaction.message.channel;

    if (currentChannel.type !== ChannelType.GuildText) {
      return;
    }

    const reactor = reaction.users.cache.first();
    let user: BottUser | undefined;
    if (reactor) {
      user = {
        id: reactor.id,
        name: reactor.username,
      };
    }

    let parent: BottEvent | undefined;
    if (reaction.message.content) {
      parent = await resolveBottEventFromMessage(
        reaction.message as Message<true>,
      );
    }

    const event = new BottEvent(BottEventType.REACTION, {
      detail: { content: reaction.emoji.toString() },
      channel: {
        id: currentChannel.id,
        name: currentChannel.name,
        space: {
          id: currentChannel.guild.id,
          name: currentChannel.guild.name,
        },
      },
      user,
      parent,
    });

    if (handleEvent) {
      callWithContext(handleEvent, {
        client,
        channel: currentChannel,
        arguments: [event],
      });
    }
  });

  // Handle commands, if they exist
  if (!commands) {
    return;
  }

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = Object.values(commands).find(({ name }) =>
      interaction.commandName === name
    );

    if (!command) {
      return;
    }

    await interaction.deferReply();

    let resultEvent: BottActionResultEvent;
    try {
      resultEvent = await resolveCommandResponseEvent<O>(
        command,
        {
          request: await resolveCommandRequestEvent<O>(interaction),
          client,
          channel: interaction.channel! as GuildTextBasedChannel,
        },
      );
    } catch (error) {
      return interaction.editReply({
        embeds: [createErrorEmbed(error as Error)],
      });
    }

    interaction.followUp(resultEvent.detail);
  });

  // Sync commands with discord origin via their custom http client 🙄:
  const body = [];
  for (const command of Object.values(commands)) {
    body.push(getCommandJson<O>(command));
  }

  await new REST({ version: "10" }).setToken(token).put(
    Routes.applicationCommands(String(client.user.id)),
    { body },
  );
}
