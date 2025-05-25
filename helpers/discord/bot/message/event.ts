import type { Message } from "npm:discord.js";

import { type BottEvent, BottEventType, BottFileType } from "@bott/data";

const URL_REGEX =
  /(?:(?:https?|ftp):\/\/|\b(?:[a-z\d]+\.))(?:(?:[^\s()<>]+|\((?:[^\s()<>]+|(?:\([^\s()<>]+\)))?\))+(?:\((?:[^\s()<>]+|(?:\(?:[^\s()<>]+\)))?\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))?/gi;

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

    if (message.attachments.size) {
      event.files = [];

      for (const attachment of message.attachments.values()) {
        if (
          !attachment.contentType ||
          !(attachment.contentType in BottFileType)
        ) {
          continue;
        }

        const fileUrl = new URL(attachment.url);
        const fileResponse = await fetch(fileUrl);

        event.files.push({
          id: attachment.id,
          name: attachment.name,
          url: new URL(attachment.url),
          data: new Uint8Array(await fileResponse.arrayBuffer()),
          type: attachment.contentType as BottFileType,
          parent: event,
        });
      }
    }

    if (URL_REGEX.test(event.details.content)) {
      event.files ??= [];

      for (
        const urlString of new Set(...event.details.content.matchAll(URL_REGEX))
      ) {
        const url = new URL(urlString);

        let urlResponse, contentType;
        try {
          urlResponse = await fetch(url);
          contentType = urlResponse.headers.get("content-type")?.split(
            ";",
          ).find((part) => part in BottFileType);
        } catch (_) {
          // Can't fetch this, continue.
          continue;
        }

        if (!contentType) {
          continue;
        }

        event.files.push({
          id: crypto.randomUUID(),
          name: url.pathname.split("/").at(-1) ?? "",
          url,
          data: new Uint8Array(await urlResponse.arrayBuffer()),
          type: contentType as BottFileType,
          parent: event,
        });
      }
    }

    event.parent = parentMessage;
  }

  return event;
};
