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
  APP_USER,
  SERVICE_DISCORD_ATTACHMENT_SIZE_LIMIT,
  SERVICE_DISCORD_TOKEN,
} from "@bott/common";
import {
  type BottService,
  BottEvent,
  BottEventType,
  createService,
} from "@bott/system";
import { retry } from "@std/async";
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

import { commandInteractionToActionCallEvent } from "./commands/interaction.ts";
import { actionToCommandJSON } from "./commands/json.ts";
import { messageToEvent } from "./messages/main.ts";

const REQUIRED_INTENTS = [
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.MessageContent,
];

export const discordService: BottService = createService({
  name: "discord",
  // TODO: resolve user
},
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

    const actions = this.system.actions;

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
      if (!reactor) {
        return;
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
          user: {
            id: reactor.id,
            name: reactor.username,
          },
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
      if (!event.channel) return;
      if (event.user.id !== APP_USER.id) return;

      const targetChannel = await client.channels.fetch(event.channel.id);

      if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
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

      const files: AttachmentBuilder[] = [];

      for (const { raw, compressed } of attachments) {
        let fileToSend = raw;

        const { size: rawSize } = await Deno.stat(raw.path);
        const { size: compressedSize } = await Deno.stat(compressed.path);

        if (
          rawSize > SERVICE_DISCORD_ATTACHMENT_SIZE_LIMIT &&
          compressedSize > SERVICE_DISCORD_ATTACHMENT_SIZE_LIMIT
        ) {
          continue;
        }

        if (rawSize > SERVICE_DISCORD_ATTACHMENT_SIZE_LIMIT) {
          fileToSend = compressed;
        }

        files.push(
          new AttachmentBuilder(
            fileToSend.path,
            {
              name: fileToSend.file.name,
            },
          ),
        );
      }

      return retry(async () => {
        return await targetChannel.send({
          content,
          files,
          // TODO: ensure we have the original discord message id
          // to reply to
          reply: event.type === BottEventType.REPLY && event.parent &&
            /^\d+$/.test(event.parent.id)
            ? { messageReference: event.parent.id }
            : undefined,
        });
      });
    };

    this.addEventListener(BottEventType.MESSAGE, forwardAppEventToChannel);
    this.addEventListener(BottEventType.REPLY, forwardAppEventToChannel);
    this.addEventListener(BottEventType.REACTION, forwardAppEventToChannel);

    await commandRegistrationPromise;
  }
);
