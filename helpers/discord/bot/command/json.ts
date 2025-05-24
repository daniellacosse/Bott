import { SlashCommandBuilder } from "npm:discord.js";

import { type Command, CommandOptionType } from "./create.ts";

const COMMAND_DESCRIPTION_LIMIT = 100;

export function getCommandJson<O extends Record<string, unknown> = {}>({
  name,
  description,
  options,
}: Command<O>) {
  const builder = new SlashCommandBuilder().setName(name);

  if (description) {
    builder.setDescription(description.slice(0, COMMAND_DESCRIPTION_LIMIT));
  }

  if (options && options.length) {
    for (const { name, description, type, required } of options) {
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
        case CommandOptionType.STRING:
          builder.addStringOption(buildOption);
          break;
        case CommandOptionType.INTEGER:
          builder.addIntegerOption(buildOption);
          break;
        case CommandOptionType.BOOLEAN:
          builder.addBooleanOption(buildOption);
          break;
      }
    }
  }

  return builder.toJSON();
}
