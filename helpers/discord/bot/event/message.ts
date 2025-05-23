import type { Message } from "npm:discord.js";

import {
  type BottEvent,
  BottEventType,
  type BottFile,
  BottFileMimetypes,
  fetchFileUrl,
} from "@bott/data";

export const message2BottEvent = async (
  message: Message<true>,
): Promise<BottEvent> => {
  const event: BottEvent = {
    id: message.id,
    type: BottEventType.MESSAGE,
    details: {
      content: (message.content || message.embeds.at(0)?.description) ??
        "[NO_CONTENT]",
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
      parentMessage = await message2BottEvent(
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
      const filePromises = message.attachments.map(
        (attachment) => {
          if (
            // skip file types we don't currently support
            !attachment.contentType ||
            !(attachment.contentType in BottFileMimetypes)
          ) {
            return Promise.resolve(null);
          }

          return fetchFileUrl(new URL(attachment.url)) as BottFile;
        },
      );

      event.files = (await Promise.all(filePromises)).filter((file) =>
        file !== null
      ) as BottFile[];
    }

    event.parent = parentMessage;
  }

  return event;
};
