import type {
  CommandInteraction,
  Message,
  MessageReaction,
} from "npm:discord.js";

import type { BottEvent, BottUser } from "@bott/data";
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

export enum CommandOptionType {
  STRING = "string",
  INTEGER = "integer",
  BOOLEAN = "boolean",
}

export type CommandOption = {
  name: string;
  type: CommandOptionType;
  description?: string;
  required?: boolean;
};

export type CommandObject = {
  description?: string;
  options?: CommandOption[];
  command: (this: BotContext, interaction: CommandInteraction) => void;
};
