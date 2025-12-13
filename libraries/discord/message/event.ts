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

import type { Message } from "discord.js";

import { type BottEvent, BottEventType } from "@bott/model";
import { addEvents, getEvents, prepareAttachmentFromUrl } from "@bott/storage";
import { log } from "@bott/logger";

import { getMarkdownLinks } from "./markdown.ts";

export const resolveBottEventFromMessage = async (
  message: Message<true>,
): Promise<BottEvent> => {
  const [possibleEvent] = await getEvents(message.id);

  if (possibleEvent) {
    return possibleEvent;
  }

  const event: BottEvent = {
    id: message.id,
    type: BottEventType.MESSAGE,
    details: {
      content: (message.content || message.embeds.at(0)?.description) ??
        "",
    },
    createdAt: new Date(message.createdTimestamp),
    channel: {
      id: message.channel.id,
      name: message.channel.name,
      space: {
        id: message.guild?.id,
        name: message.guild?.name,
      },
    },
  };

  if (message.author) {
    event.user = {
      id: message.author.id,
      name: message.author.username,
    };
  }

  if (message.reference?.messageId) {
    event.type = BottEventType.REPLY;

    let parentMessage: BottEvent | undefined;

    try {
      parentMessage = await resolveBottEventFromMessage(
        await message.channel.messages.fetch(
          message.reference.messageId,
        ),
      );
    } catch (_) {
      // If the parent message isn't available, we can't populate the parent event.
      // This can happen if the parent message was deleted or is otherwise inaccessible.
      // In this case, we'll just omit the parent event.
    }

    event.parent = parentMessage;
  }

  const urls = [
    ...message.attachments.values().map(({ url }) => url),
    ...getMarkdownLinks(message.content),
  ];

  if (urls.length) {
    event.attachments = await Promise.all(
      urls.map((url) => prepareAttachmentFromUrl(new URL(url), event)),
    );
  }

  const result = await addEvents(event);
  if ("error" in result) {
    log.error(
      "Failed to resolve message event to database:",
      result.error,
    );
  }

  return event;
};
