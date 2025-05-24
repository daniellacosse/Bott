import type { Message } from "npm:discord.js";

import { type BottEvent, BottEventType, BottFileMimetypes } from "@bott/data";

export const getMessageBottEvent = async (
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
      parentMessage = await getMessageBottEvent(
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
          !(attachment.contentType in BottFileMimetypes)
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
          mimetype: attachment.contentType as BottFileMimetypes,
        });
      }
    }

    event.parent = parentMessage;
  }

  return event;
};
