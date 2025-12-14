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
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  type InteractionReplyOptions,
  type Message,
  type MessageCreateOptions,
  REST,
  Routes,
} from "discord.js";

import {
  type AnyShape,
  BOTT_ATTACHMENT_TYPE_LOOKUP,
  type BottAction,
  BottEvent,
  BottEventType,
  BottServiceFactory,
  type BottUser,
} from "@bott/model";

import { log } from "@bott/logger";
import { STORAGE_DEPLOY_NONCE_PATH } from "@bott/constants";
import { createErrorEmbed } from "./message/embed/error.ts";
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

type DiscordBotOptions<
  O extends Record<string, unknown> = Record<string, unknown>,
> = {
  actions?: Record<string, BottAction<O, AnyShape>>;
  identityToken: string;
  mount?: (client: Client) => void;
};

const _getCurrentDeployNonce = () => {
  try {
    return Deno.readTextFileSync(STORAGE_DEPLOY_NONCE_PATH);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }
    throw error;
  }
};

export const startDiscordService: BottServiceFactory<DiscordBotOptions> =
  async ({
    identityToken: token,
    actions: commands,
    mount: handleMount,
    deployNonce,
    events,
  }) => {
    const client = new Client({ intents: REQUIRED_INTENTS });
    const pendingInteractions = new Map<string, ChatInputCommandInteraction>();

    await client.login(token);
    log.debug("Logged in.");

    if (!client.user) {
      throw new Error("Bot user is not set!");
    }
    const botUser = client.user;

    // Hydrate DB
    (async () => {
      for (const space of client.guilds.cache.values()) {
        for (const channel of space.channels.cache.values()) {
          if (channel.type !== ChannelType.GuildText) continue;
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
      handleMount(client);
    }

    // Incoming: Message
    client.on(Events.MessageCreate, async (message) => {
      if (deployNonce && _getCurrentDeployNonce() !== deployNonce) return;
      if (message.channel.type !== ChannelType.GuildText) return;

      const event = (await resolveBottEventFromMessage(
        message as Message<true>,
      )) as BottEvent;

      // Dispatch to global event bus
      globalThis.dispatchEvent(event);

      // Call specific handler
      if (events && Object.prototype.hasOwnProperty.call(events, event.type)) {
        events[event.type as keyof typeof events]!(event);
      }
    });

    // Incoming: Reaction
    client.on(Events.MessageReactionAdd, async (reaction) => {
      if (deployNonce && _getCurrentDeployNonce() !== deployNonce) return;
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

      globalThis.dispatchEvent(event);

      // Call specific handler
      if (events && events[event.type]) {
        events[event.type]!(event);
      }
    });

    // Incoming: Command Interaction
    if (commands) {
      client.on(Events.InteractionCreate, async (interaction) => {
        if (deployNonce && _getCurrentDeployNonce() !== deployNonce) return;
        if (!interaction.isChatInputCommand()) return;

        const command = Object.values(commands).find(
          ({ name }) => interaction.commandName === name,
        );

        if (!command) return;

        await interaction.deferReply();

        try {
          const requestEvent = await resolveCommandRequestEvent(interaction);
          // Track the interaction using the event ID so we can reply later
          pendingInteractions.set(requestEvent.id, interaction);

          globalThis.dispatchEvent(requestEvent);

          if (
            events &&
            Object.prototype.hasOwnProperty.call(events, requestEvent.type)
          ) {
            events[requestEvent.type as keyof typeof events]!(requestEvent);
          }
        } catch (error) {
          interaction.editReply({
            embeds: [createErrorEmbed(error as Error)],
          });
        }
      });

      // Register commands
      const body = Object.values(commands).map((cmd) => getCommandJson(cmd));
      await new REST({ version: "10" }).setToken(token).put(
        Routes.applicationCommands(String(botUser.id)),
        { body },
      );
    }

    // Outgoing: Listen for events from the app to send to Discord
    const handleOutgoingEvent = async (event: Event) => {
      // Check gate
      if (deployNonce && _getCurrentDeployNonce() !== deployNonce) return;

      const bottEvent = event as BottEvent;

      // Only handle events relevant to Discord or Action Results

      if (bottEvent.type === BottEventType.ACTION_RESULT) {
        // Handle Action Result
        if (!bottEvent.parent) return; // Should have a parent (the request)

        const interaction = pendingInteractions.get(bottEvent.parent.id);
        if (interaction) {
          pendingInteractions.delete(bottEvent.parent.id);

          try {
            // Explicitly cast to unknown then string/payload/options
            await interaction.followUp(
              bottEvent.detail as unknown as InteractionReplyOptions,
            );
          } catch (e) {
            log.error("Failed to follow up interaction", e);
          }
        }
        return;
      }

      if (
        bottEvent.type === BottEventType.MESSAGE ||
        bottEvent.type === BottEventType.REPLY ||
        bottEvent.type === BottEventType.REACTION
      ) {
        if (!bottEvent.channel) return;

        try {
          const channel = await client.channels.fetch(bottEvent.channel.id);
          if (!channel || channel.type !== ChannelType.GuildText) return;

          // Check if the user is US?
          if (bottEvent.user?.id !== botUser.id) return;

          if (bottEvent.type === BottEventType.REACTION) {
            // Handle reaction
            if (bottEvent.parent) {
              try {
                const message = await channel.messages.fetch(
                  bottEvent.parent.id,
                );
                await message.react(bottEvent.detail.content as string);
              } catch (e) {
                log.warn("Failed to react", e);
              }
            }
          } else {
            // Message or Reply
            const content = bottEvent.detail.content as string;
            const attachments = bottEvent.attachments || [];

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

            if (bottEvent.type === BottEventType.REPLY && bottEvent.parent) {
              payload.reply = { messageReference: bottEvent.parent.id };
            }

            await channel.send(payload);
          }
        } catch (error) {
          log.error("Failed to send event to Discord", error);
        }
      }
    };

    // Subscribe
    globalThis.addEventListener(BottEventType.MESSAGE, handleOutgoingEvent);
    globalThis.addEventListener(BottEventType.REPLY, handleOutgoingEvent);
    globalThis.addEventListener(BottEventType.REACTION, handleOutgoingEvent);
    globalThis.addEventListener(
      BottEventType.ACTION_RESULT,
      handleOutgoingEvent,
    );

    return { user: { id: botUser.id, name: botUser.username } };
  };
