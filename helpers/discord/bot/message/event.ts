import type { Message } from "npm:discord.js";

import { cacheAsset } from "@bott/storage";

import { type BottEvent, BottEventType } from "@bott/model";
import { getMarkdownLinks } from "./markdown.ts";

export const getMessageEvent = async (
  message: Message<true>,
): Promise<BottEvent> => {
  const event: BottEvent = {
    id: message.id,
    type: BottEventType.MESSAGE,
    details: {
      content: (message.content || message.embeds.at(0)?.description) ??
        "",
    },
    timestamp: new Date(message.createdTimestamp),
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
      parentMessage = await getMessageEvent(
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
    event.assets = [];

    for (const url of urls) {
      let asset;
      try {
        asset = await cacheAsset(new URL(url));
      } catch (error) {
        console.warn("[WARN] Failed to cache asset:", error);

        continue;
      }

      asset.parent = event;

      event.assets.push(asset);
    }
  }

  return event;
};
