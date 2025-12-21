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

import { type BottEvent, BottEventType } from "@bott/model";

import { BottServiceEvent } from "@bott/services";
import { getEvents, prepareAttachmentFromUrl } from "@bott/storage";
import type { Message } from "discord.js";

import { getMarkdownLinks } from "./markdown.ts";

export const resolveEventFromMessage = async (
  message: Message<true>,
): Promise<BottServiceEvent> => {
  const [possibleEvent] = await getEvents(message.id);

  if (possibleEvent) {
    return possibleEvent;
  }

  let type = BottEventType.MESSAGE;
  let parent: BottEvent | undefined;

  if (message.reference?.messageId) {
    type = BottEventType.REPLY;
    try {
      parent = await resolveEventFromMessage(
        await message.channel.messages.fetch(message.reference.messageId),
      );
    } catch {
      // If the parent message isn't available, we can't populate the parent event.
      // This can happen if the parent message was deleted or is otherwise inaccessible.
      // In this case, we'll just omit the parent event.
    }
  }

  const event = new BottServiceEvent(type, {
    detail: {
      content: (message.content || message.embeds.at(0)?.description) ?? "",
    },
    channel: {
      id: message.channel.id,
      name: message.channel.name as string,
      space: {
        id: message.guild?.id as string,
        name: message.guild?.name as string,
      },
    },
    user: message.author
      ? {
        id: message.author.id,
        name: message.author.username,
      }
      : undefined,
    parent,
  });

  event.id = message.id;
  event.createdAt = new Date(message.createdTimestamp);

  const urls = [
    ...message.attachments.values().map(({ url }) => url),
    ...getMarkdownLinks(message.content),
  ];

  if (urls.length) {
    event.attachments = await Promise.all(
      urls.map((url) => prepareAttachmentFromUrl(new URL(url), event)),
    );
  }

  return event;
};
