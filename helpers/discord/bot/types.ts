import type { Message, MessageReaction } from "npm:discord.js";

import type { BottEvent, BottUser } from "@bott/model";

export type DiscordBotContext = {
  user: BottUser;
  send: (
    event: BottEvent,
  ) => Promise<Message<true> | MessageReaction | undefined>;
  startTyping: () => Promise<void>;
};
