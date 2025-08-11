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
} from "npm:discord.js";

import {
  type AnyShape,
  type BottEvent,
  BottEventType,
  type BottRequestHandler,
  type BottResponseEvent,
} from "@bott/model";

import { createErrorEmbed } from "../message/embed/error.ts";
import { resolveBottEventFromMessage } from "../message/event.ts";
import { resolveCommandRequestEvent } from "./command/request.ts";
import { getCommandJson } from "./command/json.ts";
import type { DiscordBotContext } from "./context.ts";
import { resolveCommandResponseEvent } from "./command/response.ts";
import { callWithContext } from "./context.ts";

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
  requestHandlerCommands?: BottRequestHandler<O, AnyShape>[];
  event?: (this: DiscordBotContext, event: BottEvent) => void;
  identityToken: string;
  mount?: (this: DiscordBotContext) => void;
};

export async function startDiscordBot<
  O extends Record<string, unknown> = Record<string, unknown>,
>({
  identityToken: token,
  requestHandlerCommands: commands,
  event: handleEvent,
  mount: handleMount,
}: DiscordBotOptions<O>) {
  const client = new Client({ intents: REQUIRED_INTENTS });

  await client.login(token);
  console.debug("[DEBUG] Logged in.");

  // This is the Bott user object.
  if (!client.user) {
    throw new Error("Bot user is not set!");
  }

  (async () => {
    // Attempt to hydrate the DB.
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

    console.debug(
      "[DEBUG] Message event:",
      { id: event.id, preview: event.details?.content.slice(0, 100) },
    );

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
      event.parent = await resolveBottEventFromMessage(
        reaction.message as Message<true>,
      );
    }

    console.debug("[DEBUG] Reaction event:", {
      id: event.id,
      details: event.details,
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

    const command = commands.find(({ name }) =>
      interaction.commandName === name
    );

    if (!command) {
      return;
    }

    await interaction.deferReply();

    let responseEvent: BottResponseEvent;
    try {
      responseEvent = await resolveCommandResponseEvent<O>(
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

    interaction.followUp(responseEvent.details);
  });

  // Sync commands with discord origin via their custom http client 🙄:
  const body = [];
  for (const command of commands) {
    body.push(getCommandJson<O>(command));
  }

  await new REST({ version: "10" }).setToken(token).put(
    Routes.applicationCommands(String(client.user.id)),
    { body },
  );
}
