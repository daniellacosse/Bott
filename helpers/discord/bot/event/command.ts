import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "npm:discord.js";
import { type BottEvent, BottEventType } from "@bott/data";
import type { BotContext } from "../types.ts";

const COMMAND_DESCRIPTION_LIMIT = 100;

export type CommandEvent = BottEvent<>;

export type CommandResultEvent = BottEvent<>;

export type Command = {
  (
    this: BotContext,
    event: CommandEvent,
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

export const createCommand = () => {
};

export function interactionCommand2BottRequestEvent(
  interaction: ChatInputCommandInteraction,
): BottEvent<{ name: string; prompt: string }> {
  const event: BottEvent<{ name: string; prompt: string }> = {
    id: crypto.randomUUID(),
    type: BottEventType.REQUEST,
    details: {
      name: interaction.commandName,
      prompt: interaction.get("prompt")?.value,
    },
    user: {
      id: interaction.user.id,
      name: interaction.user.username,
    },
    channel: {
      id: interaction.channel!.id,
      name: interaction.channel!.name,
      space: {
        id: interaction.guild!.id,
        name: interaction.guild!.name,
      },
    },
    timestamp: new Date(),
  };

  return event;
}

export function command2Json({
  name,
  description,
  options,
}: Command) {
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
