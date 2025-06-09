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

import { SlashCommandBuilder } from "npm:discord.js";

import {
  type AnyShape,
  type BottRequestHandler,
  BottRequestOptionType,
} from "@bott/model";

const COMMAND_DESCRIPTION_LIMIT = 100;

export function getCommandJson<
  O extends Record<string, unknown> = Record<string, unknown>,
>({
  name,
  description,
  options,
}: BottRequestHandler<O, AnyShape>) {
  const builder = new SlashCommandBuilder().setName(name);

  if (description) {
    builder.setDescription(description.slice(0, COMMAND_DESCRIPTION_LIMIT));
  }

  if (options && options.length) {
    for (const { name, description, type, required } of options) {
      // deno-lint-ignore no-explicit-any
      const buildOption = (option: any) => {
        if (name) {
          option.setName(name);
        }

        if (description) {
          option.setDescription(description);
        }

        if (required) {
          option.setRequired(required);
        }

        return option;
      };

      switch (type) {
        case BottRequestOptionType.STRING:
          builder.addStringOption(buildOption);
          break;
        case BottRequestOptionType.INTEGER:
          builder.addIntegerOption(buildOption);
          break;
        case BottRequestOptionType.BOOLEAN:
          builder.addBooleanOption(buildOption);
          break;
      }
    }
  }

  return builder.toJSON();
}
