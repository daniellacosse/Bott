import type { Message } from "npm:discord.js";

export enum MessageClass {
  BOT = "bot",
  MENTION = "mention",
  REPLY = "reply",
  USER = "user",
}

export async function classifyMessage(
  message: Message,
  botHandle: string,
): Promise<MessageClass> {
  if (message.author.bot) {
    return MessageClass.BOT;
  }

  if (message.content.includes(`<@${botHandle}>`)) {
    return MessageClass.MENTION;
  }

  if (message.reference && message.reference.messageId) {
    const referencedMessage = await message.channel.messages.fetch(
      message.reference.messageId,
    );

    if (referencedMessage.author.id === botHandle) {
      return MessageClass.REPLY;
    }
  }

  return MessageClass.USER;
}
