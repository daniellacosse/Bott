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
  type AnyBottEvent,
  BOTT_FILE_TYPE_LOOKUP,
  type BottEvent,
  BottEventType,
  type BottUser,
} from "@bott/model";

import { resolveBottEventFromMessage } from "../message/event.ts";

export type DiscordBotContext = {
  user: BottUser;
  send: (
    event: BottEvent,
  ) => Promise<AnyBottEvent | undefined>;
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

        for (const file of event.files ?? []) {
          if (!file.raw) {
            continue;
          }

          files.push(
            new AttachmentBuilder(Buffer.from(file.raw.data as Uint8Array), {
              name: `${file.id}.${
                BOTT_FILE_TYPE_LOOKUP[file.raw.type].toLowerCase()
              }`,
            }),
          );
        }

        let messageResult;
        switch (event.type) {
          case BottEventType.MESSAGE:
            messageResult = await channel?.send({
              content: event.details.content,
              files,
            });
            break;
          case BottEventType.REPLY: {
            const sourceMessage = await channel?.messages.fetch(
              String(event.parent!.id),
            );
            messageResult = await sourceMessage?.reply({
              content: event.details.content,
              files,
            });
            break;
          }
          case BottEventType.REACTION: {
            const sourceMessage = await channel?.messages.fetch(
              // TODO (nit): Sometimes this isn't a Discord ID...
              String(event.parent!.id),
            );
            // There's no Discord DB object for reactions
            await sourceMessage?.react(event.details.content);
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
