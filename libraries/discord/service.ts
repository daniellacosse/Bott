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
  type ChatInputCommandInteraction,
  Client,
  Events as DiscordEvents,
  GatewayIntentBits,
  type InteractionReplyOptions,
  type Message,
  type MessageCreateOptions,
  REST,
  Routes,
} from "discord.js";

import {
  BOTT_ATTACHMENT_TYPE_LOOKUP,
  type BottAction,
  type BottActionResultEvent,
  BottEventType,
  type BottService,
  type BottServiceFactory,
  type BottUser,
} from "@bott/model";
import { addEventListener, BottEvent } from "@bott/service";
import { log } from "@bott/logger";

import { resolveBottEventFromMessage } from "./message/event.ts";
import { getCommandJson } from "./command/json.ts";
import { resolveCommandRequestEvent } from "./command/request.ts";

const REQUIRED_INTENTS = [
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.MessageContent,
];

export const startDiscordService: BottServiceFactory = async ({
  identityToken: token = "",
  actions = {},
}: { identityToken?: string; actions?: Record<string, BottAction> }) => {
  const client = new Client({ intents: REQUIRED_INTENTS });
  const pendingInteractions = new Map<string, ChatInputCommandInteraction>();

  await client.login(token);

  if (!client.user) {
    throw new Error("Discord user is not set!");
  }
  const serviceUser = client.user;

  client.on(DiscordEvents.MessageCreate, async (message) => {
    if (message.channel.type !== ChannelType.GuildText) return;

    const event = (await resolveBottEventFromMessage(
      message as Message<true>,
    )) as BottEvent;

    globalThis.dispatchEvent(event);
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
      parent = await resolveBottEventFromMessage(
        reaction.message as Message<true>,
      );
    }

    globalThis.dispatchEvent(
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

    const action = Object.values(actions).find(
      ({ name }) => interaction.commandName === name,
    );

    if (!action) return;

    await interaction.deferReply();

    try {
      const requestEvent = await resolveCommandRequestEvent(interaction);
      // Track the interaction using the event ID so we can reply later
      pendingInteractions.set(requestEvent.id, interaction);

      globalThis.dispatchEvent(requestEvent);
    } catch (error) {
      log.error("Failed to resolve command request event", error);

      // TODO: dispatch error event
    }
  });

  const forwardSystemEvent = async (
    event: BottEvent,
    service?: BottService,
  ) => {
    if (!event.channel) return;
    if (service?.user?.id === serviceUser.id) return;
    if (!service) return;

    try {
      const channel = await client.channels.fetch(event.channel.id);
      if (!channel || channel.type !== ChannelType.GuildText) return;

      if (event.type === BottEventType.REACTION) {
        try {
          const message = await channel.messages.fetch(
            event.parent!.id,
          );
          await message.react(event.detail.content as string);
        } catch (e) {
          log.warn("Failed to react", e);
        }
      } else {
        // Message or Reply
        const content = event.detail.content as string;
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
                name: `${attachment.id}.${
                  BOTT_ATTACHMENT_TYPE_LOOKUP[
                    attachment.raw.file
                      .type as keyof typeof BOTT_ATTACHMENT_TYPE_LOOKUP
                  ].toLowerCase()
                }`,
              },
            ),
          );
        }

        const payload: MessageCreateOptions = { content, files };

        if (event.type === BottEventType.REPLY && event.parent) {
          payload.reply = { messageReference: event.parent.id };
        }

        await channel.send(payload);
      }
    } catch (error) {
      log.error("Failed to send event to Discord", error);
    }
  };

  addEventListener(BottEventType.MESSAGE, forwardSystemEvent);
  addEventListener(BottEventType.REPLY, forwardSystemEvent);
  addEventListener(BottEventType.REACTION, forwardSystemEvent);

  if (actions) {
    // Register actions as commands
    const body = Object.values(actions).map((cmd) => getCommandJson(cmd));
    await new REST({ version: "10" }).setToken(token).put(
      Routes.applicationCommands(String(serviceUser.id)),
      { body },
    );
  }

  return { user: { id: serviceUser.id, name: serviceUser.username } };
};
