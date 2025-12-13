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

import type { Client, EmbedBuilder, GuildTextBasedChannel } from "discord.js";
import type {
  AnyShape,
  BottAction,
  BottActionCallEvent,
  BottActionResultEvent,
} from "@bott/model";
import { addEvents } from "@bott/storage";
import { callWithContext } from "../context.ts";
import { log } from "@bott/logger";

type DiscordResponseEvent = BottActionResultEvent<
  { content: string; embeds: EmbedBuilder[] }
>;

export const resolveCommandResponseEvent = async <
  O extends Record<string, unknown>,
>(
  command: BottAction<O, AnyShape>,
  { client, request, channel }: {
    client: Client;
    request: BottActionCallEvent<O>;
    channel: GuildTextBasedChannel;
  },
): Promise<DiscordResponseEvent> => {
  const response = await callWithContext(command, {
    client,
    channel,
    arguments: [request],
  }) as DiscordResponseEvent;

  const result = addEvents(response);
  if ("error" in result) {
    log.error(
      "Failed to resolve response event to database:",
      result.error,
    );
  }

  return response;
};
