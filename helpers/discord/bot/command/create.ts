import type { BottEvent, BottEventType } from "@bott/data";
import type { BotContext } from "../types.ts";

export type CommandEvent<O extends Record<string, unknown> = {}> = BottEvent<
  { name: string; options: O },
  BottEventType.REQUEST
>;

export type CommandResultEvent = BottEvent;

export type Command<O extends Record<string, unknown> = {}> = {
  (
    this: BotContext,
    event: CommandEvent<O>,
  ): Promise<CommandResultEvent | void>;
  name: string;
  description?: string;
  options?: CommandOption[];
};

export type CommandOption = {
  name: string;
  type: CommandOptionType;
  description?: string;
  required?: boolean;
};

export enum CommandOptionType {
  STRING = "string",
  INTEGER = "integer",
  BOOLEAN = "boolean",
}

export const createCommand = <O extends Record<string, unknown> = {}>(
  config: {
    name: string;
    description?: string;
    options?: CommandOption[];
  },
  fn: (
    this: BotContext,
    event: CommandEvent<O>,
  ) => Promise<CommandResultEvent | void>,
): Command<O> => {
  return Object.assign(fn, config);
};
