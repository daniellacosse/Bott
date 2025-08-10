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

import type { GuildTextBasedChannel } from "npm:discord.js";
import type {
  BottRequestEvent,
  BottRequestHandler,
  BottResponseEvent,
} from "@bott/model";
import { addEventData } from "@bott/storage";
import { callWithContext } from "../context.ts";

export const resolveCommandResponseEvent = async <
  O extends Record<string, unknown>,
>(
  command: BottRequestHandler<O>,
  requestEvent: BottRequestEvent<O>,
): Promise<BottResponseEvent> => {
  const response = await callWithContext(command, {
    channel: interaction.channel as GuildTextBasedChannel,
    arguments: [requestEvent],
  });

  const result = addEventData(response);
  if ("error" in result) {
    console.error(
      "[ERROR] Failed to resolve response event to database:",
      result.error,
    );
  }

  return response;
};
