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
  BottFileType,
  type BottRequestHandler,
} from "@bott/model";

import type { addEventData } from "@bott/storage";

import { createErrorEmbed } from "../message/embed/error.ts";
import { messageToBottEvent } from "../message/event.ts";
import { getCommandRequestEvent } from "./command/request.ts";
import { getCommandJson } from "./command/json.ts";
import type { DiscordBotContext } from "./types.ts";

// TODO: Don't repeat this.
const REVERSE_FILE_TYPE_ENUM = Object.fromEntries(
  Object.entries(BottFileType).map(([key, value]) => [value, key]),
);

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
};

export async function startDiscordBot<
  O extends Record<string, unknown> = Record<string, unknown>,
>({
  identityToken: token,
  requestHandlerCommands: commands,
  addEventData,
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

      const files = [];

      for (const file of event.files ?? []) {
        if (!file.raw) {
          continue;
        }

        files.push(
          new AttachmentBuilder(Buffer.from(file.raw.data as Uint8Array), {
            name: `${file.id}.${
              REVERSE_FILE_TYPE_ENUM[file.raw.type].toLowerCase()
            }`,
          }),
        );
      }

      let messageResult;
      switch (event.type) {
        case BottEventType.MESSAGE:
          messageResult = await currentChannel.send({
            content: event.details.content,
            files,
          });
          break;
        case BottEventType.REPLY: {
          const sourceMessage = await currentChannel.messages.fetch(
            String(event.parent!.id),
          );
          messageResult = await sourceMessage.reply({
            content: event.details.content,
            files,
          });
          break;
        }
        case BottEventType.REACTION: {
          const sourceMessage = await currentChannel.messages.fetch(
            // TODO (nit): Sometimes this isn't a Discord ID...
            String(event.parent!.id),
          );
          // There's no Discord DB object for reactions
          await sourceMessage.react(event.details.content);
          break;
        }
        default:
          return;
      }

      if (messageResult && "id" in messageResult) {
        event.id = messageResult.id;
      }

      const eventTransaction = addEventData(event);
      if ("error" in eventTransaction) {
        console.error(
          "[ERROR] Failed to add sent event to database:",
          eventTransaction.error,
        );
      }

      return event;
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
            events.push(await messageToBottEvent(message));
          }
        } catch (_) {
          // Likely don't haveaccess to this channel
        }
      }
    }

    const result = addEventData(...events);

    if ("error" in result) {
      console.error("[ERROR] Failed to hydrate database:", result.error);
    } else {
      console.info("[INFO] Hydrated database with", events.length, "events.");
    }
  })();

  handleMount?.call(_makeSelf());

  client.on(Events.MessageCreate, async (message) => {
    const currentChannel = message.channel;

    if (currentChannel.type !== ChannelType.GuildText) {
      return;
    }

    const event = await messageToBottEvent(
      message as Message<true>,
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
      event.parent = await messageToBottEvent(
        reaction.message as Message<true>,
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
