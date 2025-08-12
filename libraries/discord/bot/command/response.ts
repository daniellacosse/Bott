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

import type {
  Client,
  EmbedBuilder,
  GuildTextBasedChannel,
} from "npm:discord.js";
import type {
  AnyShape,
  BottRequestEvent,
  BottRequestHandler,
  BottResponseEvent,
} from "@bott/model";
import { addEventData } from "@bott/storage";
import { callWithContext } from "../context.ts";

type DiscordResponseEvent = BottResponseEvent<
  { content: string; embeds: EmbedBuilder[] }
>;

export const resolveCommandResponseEvent = async <
  O extends Record<string, unknown>,
>(
  command: BottRequestHandler<O, AnyShape>,
  { client, request, channel }: {
    client: Client;
    request: BottRequestEvent<O>;
    channel: GuildTextBasedChannel;
  },
): Promise<DiscordResponseEvent> => {
  const response = await callWithContext(command, {
    client,
    channel,
    arguments: [request],
  }) as DiscordResponseEvent;

  const result = addEventData(response);
  if ("error" in result) {
    console.error(
      "[ERROR] Failed to resolve response event to database:",
      result.error,
    );
  }

  return response;
};
