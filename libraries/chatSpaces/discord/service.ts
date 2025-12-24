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
import { APP_USER, SERVICE_DISCORD_TOKEN } from "@bott/constants";
import { BottEvent, BottEventType } from "@bott/events";
import { log } from "@bott/log";
import type { BottUser } from "@bott/model";
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
  type Message,
  MessageFlags,
  REST,
  Routes,
} from "discord.js";

import { commandInteractionToActionCallEvent } from "./command/interaction.ts";
import { actionToCommandJSON } from "./command/json.ts";
import { messageToEvent } from "./message/event.ts";

const REQUIRED_INTENTS = [
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.MessageContent,
];

const settings: BottServiceSettings = {
  name: "discord",
};

export const discordService: BottService = createService(
  async function () {
    const client = new Client({ intents: REQUIRED_INTENTS });

    if (!SERVICE_DISCORD_TOKEN) {
      throw new Error(
        "Cannot start: the `SERVICE_DISCORD_TOKEN` is not set",
      );
    }

    await client.login(SERVICE_DISCORD_TOKEN);

    if (!client.user) {
      throw new Error(
        "Failed to start: the `client.user` was not set",
      );
    }

    const api = new REST({ version: "10" }).setToken(SERVICE_DISCORD_TOKEN);

    const actions = this.settings.actions;

    let commandRegistrationPromise: Promise<unknown> | undefined;
    if (actions) {
      commandRegistrationPromise = api.put(
        Routes.applicationCommands(client.user.id),
        { body: Object.values(actions).map(actionToCommandJSON) },
      );
    }

    // Forward messages from Discord to the system
    client.on(DiscordEvents.MessageCreate, async (message) => {
      if (message.channel.type !== ChannelType.GuildText) return;
      if (message.author.id === client.user?.id) return;

      this.dispatchEvent(
        await messageToEvent(
          message as Message<true>,
        ),
      );
    });

    client.on(DiscordEvents.MessageReactionAdd, async (reaction) => {
      const currentChannel = reaction.message.channel;
      if (currentChannel.type !== ChannelType.GuildText) return;

      const currentSpace = currentChannel.guild;

      const reactor = reaction.users.cache.first();
      let user: BottUser | undefined;
      if (reactor) {
        user = { id: reactor.id, name: reactor.username };
      }

      let parent: BottEvent | undefined;
      if (reaction.message.content) {
        parent = await messageToEvent(
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
              id: currentSpace.id,
              name: currentSpace.name,
            },
          },
          user,
          parent,
        }),
      );
    });

    client.on(DiscordEvents.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const action = Object.values(actions).find(
        ({ name }) => interaction.commandName === name,
      );

      if (!action) return;

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const actionCallEvent = await commandInteractionToActionCallEvent(
        interaction,
      );

      const outputOrStopType = [
        BottEventType.ACTION_OUTPUT,
        BottEventType.ACTION_COMPLETE,
        BottEventType.ACTION_ERROR,
      ];

      this.dispatchEvent(actionCallEvent);

      // Wait for the action to begin output or complete
      await new Promise<void>((resolve) => {
        const resolveIfCurrentAction = (event: BottEvent) => {
          if (event.detail.id !== actionCallEvent.id) return;

          for (const eventType of outputOrStopType) {
            this.removeEventListener(eventType, resolveIfCurrentAction);
          }

          resolve();
        };

        for (const eventType of outputOrStopType) {
          this.addEventListener(eventType, resolveIfCurrentAction);
        }
      });

      await interaction.deleteReply();
    });

    // Forward events from Bott (App) to Discord
    const forwardAppEventToChannel = async (event: BottEvent) => {
      if (!event.channel) {
        log.debug("Not fowarding: No channel in event.", event);
        return;
      }

      if (event.user?.id !== APP_USER.id) {
        log.debug(
          "Not fowarding: not from Bott App Service User, user: ",
          event.user?.id,
          event,
        );
        return;
      }

      const targetChannel = await client.channels.fetch(event.channel.id);

      if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        log.debug(
          "Not fowarding: Discord channel not found or not GuildText.",
          event,
        );
        return;
      }

      // Reaction
      const content = event.detail?.content as string | undefined;
      if (
        content && event.type === BottEventType.REACTION && event.parent
      ) {
        const message = await targetChannel.messages.fetch(
          event.parent.id,
        );

        return message.react(content);
      }

      // Message or Reply
      const attachments = event.attachments ?? [];

      if (!content && attachments.length === 0) return;

      const files = [];

      for (const attachment of attachments) {
        const file = attachment.raw.file ?? attachment.compressed.file;

        files.push(
          new AttachmentBuilder(
            Buffer.from(await file.arrayBuffer()),
            {
              name: file.name,
            },
          ),
        );
      }

      return targetChannel.send({
        content,
        files,
        reply: event.type === BottEventType.REPLY && event.parent
          ? { messageReference: event.parent.id }
          : undefined,
      });
    };

    const forwardMessageToChannel = (event: BottEvent) =>
      forwardAppEventToChannel(event);
    const forwardReplyToChannel = (event: BottEvent) =>
      forwardAppEventToChannel(event);
    const forwardReactionToChannel = (event: BottEvent) =>
      forwardAppEventToChannel(event);

    this.addEventListener(BottEventType.MESSAGE, forwardMessageToChannel);
    this.addEventListener(BottEventType.REPLY, forwardReplyToChannel);
    this.addEventListener(BottEventType.REACTION, forwardReactionToChannel);

    await commandRegistrationPromise;
  },
  settings,
);
