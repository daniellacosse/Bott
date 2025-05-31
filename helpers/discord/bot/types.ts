import type { Message, MessageReaction } from "npm:discord.js";

import type { BottEvent, BottUser } from "@bott/model";

import type { TaskManager } from "./task/manager.ts";

export type BotContext = {
  user: BottUser;
  send: (
    event: BottEvent,
  ) => Promise<Message<true> | MessageReaction | undefined>;
  startTyping: () => Promise<void>;
  taskManager: TaskManager;
  wpm: number;
};
