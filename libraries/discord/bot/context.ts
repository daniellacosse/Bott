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
  type Client,
  type GuildTextBasedChannel,
} from "discord.js";

import {
  BOTT_ATTACHMENT_TYPE_LOOKUP,
  type BottEvent,
  BottEventType,
  type BottUser,
} from "@bott/model";

import { resolveBottEventFromMessage } from "../message/event.ts";
import { log } from "@bott/logger";

// TODO(#63): Generalize the action context and hoist it
export type DiscordBotContext = {
  user: BottUser;
  send: (
    event: BottEvent,
  ) => Promise<BottEvent | undefined>;
  startTyping: () => Promise<void> | undefined;
};

export const callWithContext = <
  A extends unknown[] = [],
  B extends unknown = unknown,
>(
  functionToCall: (this: DiscordBotContext, ...args: A) => B,
  {
    arguments: args,
    client,
    channel,
  }: {
    arguments?: A;
    client: Client;
    channel?: GuildTextBasedChannel;
  },
) => {
  return functionToCall.call(
    {
      user: {
        id: client.user!.id,
        name: client.user!.username,
      },
      startTyping: () => {
        return channel?.sendTyping();
      },
      send: async (event: BottEvent) => {
        const files = [];

        for (const file of event.attachments ?? []) {
          if (!file.raw) {
            continue;
          }

          files.push(
            new AttachmentBuilder(Buffer.from(file.raw.data as Uint8Array), {
              name: `${file.id}.${
                BOTT_ATTACHMENT_TYPE_LOOKUP[file.raw.type].toLowerCase()
              }`,
            }),
          );
        }

        const messageContent = event.details.content as string;

        let messageResult;
        switch (event.type) {
          case BottEventType.MESSAGE:
            messageResult = await channel?.send({
              content: messageContent,
              files,
            });
            break;
          case BottEventType.REPLY: {
            if (!event.parent) {
              log.warn("Tried to send a reply without a parent", event);
              return;
            }

            const sourceMessage = await channel?.messages.fetch(
              String(event.parent.id),
            );
            messageResult = await sourceMessage?.reply({
              content: messageContent,
              files,
            });
            break;
          }
          case BottEventType.REACTION: {
            if (!event.parent) {
              log.warn("Tried to send a reaction without a parent", event);
              return;
            }

            const sourceMessage = await channel?.messages.fetch(
              // TODO (nit): Sometimes this isn't a Discord ID...
              String(event.parent.id),
            );
            // There's no Discord DB object for reactions
            await sourceMessage?.react(messageContent);
            break;
          }
          default:
            return;
        }

        if (messageResult) {
          return resolveBottEventFromMessage(messageResult);
        }
      },
    },
    ...(args ?? [] as unknown as A),
  );
};
