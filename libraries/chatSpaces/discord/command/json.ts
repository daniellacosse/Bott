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

import type { BottAction } from "@bott/actions";
import { SERVICE_DISCORD_COMMAND_DESCRIPTION_LIMIT } from "@bott/constants";

import {
  type SlashCommandAttachmentOption,
  type SlashCommandBooleanOption,
  SlashCommandBuilder,
  type SlashCommandNumberOption,
  type SlashCommandStringOption,
} from "discord.js";

type SlashCommandOption =
  | SlashCommandBooleanOption
  | SlashCommandStringOption
  | SlashCommandNumberOption
  | SlashCommandAttachmentOption;

export function actionToCommandJSON({
  name,
  instructions,
  parameters,
}: BottAction) {
  const builder = new SlashCommandBuilder().setName(name);

  builder.setDescription(
    instructions.slice(0, SERVICE_DISCORD_COMMAND_DESCRIPTION_LIMIT),
  );

  if (!parameters?.length) {
    return builder.toJSON();
  }

  for (
    const {
      name,
      description,
      type,
      required,
      allowedValues,
      defaultValue,
    } of parameters
  ) {
    const buildOption = <T extends SlashCommandOption>(option: T) => {
      option.setName(name);

      if (description) {
        option.setDescription(
          (defaultValue && type !== "file"
            ? `${description} (Default: ${defaultValue})`
            : description).slice(0, SERVICE_DISCORD_COMMAND_DESCRIPTION_LIMIT),
        );
      }

      if (required && !defaultValue) {
        option.setRequired(required);
      }

      if (allowedValues && type === "string") {
        (option as SlashCommandStringOption).addChoices(
          allowedValues.map((value) => ({
            name: String(value),
            value: String(value),
          })),
        );
      }

      return option;
    };

    switch (type) {
      case "string":
        builder.addStringOption(buildOption<SlashCommandStringOption>);
        break;
      case "number":
        builder.addNumberOption(buildOption<SlashCommandNumberOption>);
        break;
      case "boolean":
        builder.addBooleanOption(buildOption<SlashCommandBooleanOption>);
        break;
      case "file":
        builder.addAttachmentOption(buildOption<SlashCommandAttachmentOption>);
        break;
    }
  }

  return builder.toJSON();
}
