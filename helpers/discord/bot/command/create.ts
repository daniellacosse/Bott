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

import type { EmbedBuilder } from "npm:discord.js";

import type { BottEvent, BottEventType } from "@bott/model";

import type { BotContext } from "../types.ts";

export type CommandRequestEvent<O extends Record<string, unknown> = {}> =
  BottEvent<
    { name: string; options: O }
  >;

export type CommandResponseEvent = BottEvent<
  {
    content?: string;
    embeds?: (EmbedBuilder | ReturnType<EmbedBuilder["toJSON"]>)[];
  }
>;

export type Command<O extends Record<string, unknown> = {}> = {
  (
    this: BotContext,
    event: CommandRequestEvent<O>,
  ): Promise<CommandResponseEvent | void>;
  commandName: string;
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
  { name, ...params }: {
    name: string;
    description?: string;
    options?: CommandOption[];
  },
  fn: (
    this: BotContext,
    event: CommandRequestEvent<O>,
  ) => Promise<CommandResponseEvent | void>,
): Command<O> => {
  return Object.assign(fn, { commandName: name, ...params });
};
