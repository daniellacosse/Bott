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
import { SERVICE_DISCORD_TOKEN } from "@bott/constants";
import {
  BOTT_ATTACHMENT_TYPE_LOOKUP,
  BottEvent,
  BottEventType,
  type BottUser,
} from "@bott/model";
import {
  type BottService,
  type BottServiceSettings,
  createService,
} from "@bott/services";
import {
  AttachmentBuilder,
  ChannelType,
  Client,
  Events as DiscordEvents,
  GatewayIntentBits,
  type JSONEncodable,
  type Message,
  type MessageCreateOptions,
  REST,
  Routes,
} from "discord.js";

import { getCommandJson } from "./command/json.ts";
import { resolveCommandRequestEvent } from "./command/request.ts";
import { resolveEventFromMessage } from "./message/event.ts";

const REQUIRED_INTENTS = [
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.MessageContent,
];

const settings: BottServiceSettings = {
  name: "discord",
  events: new Set([
    BottEventType.MESSAGE,
    BottEventType.REPLY,
    BottEventType.REACTION,
  ]),
};

export const discordService: BottService = createService(
  async function () {
    const client = new Client({ intents: REQUIRED_INTENTS });

    if (!SERVICE_DISCORD_TOKEN) {
      throw new Error("SERVICE_DISCORD_TOKEN is not set");
    }

    await client.login(SERVICE_DISCORD_TOKEN);

    if (!client.user) {
      throw new Error("Discord user is not set!");
    }

    client.on(DiscordEvents.MessageCreate, async (message) => {
      if (message.channel.type !== ChannelType.GuildText) return;

      const event = (await resolveEventFromMessage(
        message as Message<true>,
      )) as BottEvent;

      this.dispatchEvent(event);
    });

    client.on(DiscordEvents.MessageReactionAdd, async (reaction) => {
      const currentChannel = reaction.message.channel;
      if (currentChannel.type !== ChannelType.GuildText) return;

      const reactor = reaction.users.cache.first();
      let user: BottUser | undefined;
      if (reactor) {
        user = { id: reactor.id, name: reactor.username };
      }

      let parent: BottEvent | undefined;
      if (reaction.message.content) {
        parent = await resolveEventFromMessage(
          reaction.message as Message<true>,
        );
      }

      this.dispatchEvent(
        new BottEvent(BottEventType.REACTION, {
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
        }),
      );
    });

    client.on(DiscordEvents.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const action = Object.values(this.settings.actions).find(
        ({ name }) => interaction.commandName === name,
      );

      if (!action) return;

      dispatchEvent(
        await resolveCommandRequestEvent(
          interaction,
          this,
        ),
      );
    });

    const forwardEventToChannelIfNotSelf = async (event: BottEvent) => {
      if (!event.channel) return;
      if (event.user?.id === client.user?.id) return;

      const content = event.detail.content as string;

      const channel = await client.channels.fetch(event.channel.id);
      if (!channel || channel.type !== ChannelType.GuildText) return;

      if (event.type === BottEventType.REACTION && event.parent) {
        const message = await channel.messages.fetch(
          event.parent.id,
        );

        return message.react(content);
      }

      // Message or Reply (or force reaction)
      const attachments = event.attachments || [];

      if (!content && attachments.length === 0) return;

      const files = [];

      for (const attachment of attachments) {
        if (!attachment.raw?.file) {
          continue;
        }

        files.push(
          new AttachmentBuilder(
            Buffer.from(
              new Uint8Array(await attachment.raw.file.arrayBuffer()),
            ),
            {
              name: `${attachment.id}.${BOTT_ATTACHMENT_TYPE_LOOKUP[
                  attachment.raw.file
                    .type as keyof typeof BOTT_ATTACHMENT_TYPE_LOOKUP
                ].toLowerCase()
                }`,
            },
          ),
        );
      }

      const payload: MessageCreateOptions = { content, files };

      if (event.detail.embed) {
        // deno-lint-ignore no-explicit-any
        payload.embeds = [event.detail.embed as JSONEncodable<any>];
      }

      if (event.type === BottEventType.REPLY && event.parent) {
        payload.reply = { messageReference: event.parent.id };
      }

      return channel.send(payload);
    };

    this.addEventListener(BottEventType.MESSAGE, forwardEventToChannelIfNotSelf);
    this.addEventListener(BottEventType.REPLY, forwardEventToChannelIfNotSelf);
    this.addEventListener(BottEventType.REACTION, forwardEventToChannelIfNotSelf);

    const actions = this.settings.actions;
    if (actions) {
      // Register actions as commands
      const body = Object.values(actions).map((cmd) => getCommandJson(cmd));
      await new REST({ version: "10" }).setToken(SERVICE_DISCORD_TOKEN).put(
        Routes.applicationCommands(String(client.user.id)),
        { body },
      );
    }
  },
  settings,
);
