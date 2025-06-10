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

import { Buffer } from "node:buffer";
import {
  AttachmentBuilder,
  ChannelType,
  Client,
  type EmbedBuilder,
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
} from "@bott/model";

import type { addEventData, storeNewInputFile } from "@bott/storage";

import { createErrorEmbed } from "../message/embed/error.ts";
import { getMessageEvent } from "../message/event.ts";
import { getCommandRequestEvent } from "./command/request.ts";
import { getCommandJson } from "./command/json.ts";
import type { DiscordBotContext } from "./types.ts";

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
  addEventData: typeof addEventData;
  storeNewInputFile: typeof storeNewInputFile;
};

export async function startDiscordBot<
  O extends Record<string, unknown> = Record<string, unknown>,
>({
  identityToken: token,
  requestHandlerCommands: commands,
  addEventData,
  storeNewInputFile,
  event: handleEvent,
  mount: handleMount,
}: DiscordBotOptions<O>) {
  const client = new Client({ intents: REQUIRED_INTENTS });

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
  };

  const _makeSelf = (currentChannel?: GuildTextBasedChannel) => ({
    ...baseSelf,
    startTyping: () => {
      if (!currentChannel) return Promise.resolve();

      return currentChannel.sendTyping();
    },
    send: async (event: BottEvent) => {
      if (!currentChannel) return;

      const files = event.files?.map((
        file,
      ) =>
        new AttachmentBuilder(Buffer.from(file.data), {
          name: file.path.split("/").at(-1),
        })
      );

      let message;
      switch (event.type) {
        case BottEventType.MESSAGE:
          message = await currentChannel.send({
            content: event.details.content,
            files,
          });
          break;
        case BottEventType.REPLY: {
          message = await currentChannel.messages.fetch(
            String(event.parent!.id),
          );
          message.reply({
            content: event.details.content,
            files,
          });
          break;
        }
        case BottEventType.REACTION: {
          message = await currentChannel.messages.fetch(
            // TODO: Sometimes this isn't a Discord ID...
            String(event.parent!.id),
          );
          message.react(event.details.content);
          break;
        }
        default:
          return;
      }

      if (message && "id" in message) {
        event.id = message.id;
      }

      const eventTransaction = addEventData(event);
      if ("error" in eventTransaction) {
        console.error(
          "[ERROR] Failed to add sent event to database:",
          eventTransaction.error,
        );
      }

      return message;
    },
  });

  (async () => {
    // Attempt to hydrate the DB.
    // TODO(#36): Skip if the DB has data in it.
    const events: BottEvent[] = [];

    // Discord "guilds" are equivalent to Bott's "spaces":
    for (const space of client.guilds.cache.values()) {
      for (const channel of space.channels.cache.values()) {
        if (channel.type !== ChannelType.GuildText) {
          continue;
        }

        try {
          for (const [_, message] of await channel.messages.fetch()) {
            events.push(await getMessageEvent(message, storeNewInputFile));
          }
        } catch (_) {
          // Likely don't have access to this channel
        }
      }
    }

    const result = addEventData(...events);

    if ("error" in result) {
      console.error("[ERROR] Failed to hydrate database:", result.error);
    }
  })();

  handleMount?.call(_makeSelf());

  client.on(Events.MessageCreate, async (message) => {
    const currentChannel = message.channel;

    if (currentChannel.type !== ChannelType.GuildText) {
      return;
    }

    const event: BottEvent = await getMessageEvent(
      message as Message<true>,
      storeNewInputFile,
    );

    console.debug(
      "[DEBUG] Message event:",
      { id: event.id, preview: event.details?.content.slice(0, 100) },
    );

    handleEvent?.call(_makeSelf(currentChannel), event);
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
      event.parent = await getMessageEvent(
        reaction.message as Message<true>,
        storeNewInputFile,
      );
    }

    console.debug("[DEBUG] Reaction event:", {
      id: event.id,
      details: event.details,
    });

    handleEvent?.call(_makeSelf(currentChannel), event);
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

    let responseEvent;

    try {
      const requestEvent = await getCommandRequestEvent<O>(interaction);

      addEventData(requestEvent);

      responseEvent = await command.call(
        _makeSelf(interaction.channel! as GuildTextBasedChannel),
        requestEvent,
      );
    } catch (error) {
      return interaction.editReply({
        embeds: [createErrorEmbed(error as Error)],
      });
    }

    if (!responseEvent) {
      return;
    }

    interaction.followUp({
      content: responseEvent.details.content as string || undefined,
      embeds: responseEvent.details.embeds as EmbedBuilder[],
    });

    addEventData(responseEvent);
  });

  // Sync commands with discord origin via their custom http client 🙄:
  const body = [];
  for (const command of commands) {
    body.push(getCommandJson<O>(command));
  }

  await new REST({ version: "10" }).setToken(token).put(
    Routes.applicationCommands(String(baseSelf.user.id)),
    { body },
  );
}
