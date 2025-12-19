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
import { SlashCommandBuilder } from "discord.js";

const COMMAND_DESCRIPTION_LIMIT = 100;

export function getCommandJson({
  name,
  instructions,
  parameters,
}: BottAction) {
  const builder = new SlashCommandBuilder().setName(name);

  builder.setDescription(instructions.slice(0, COMMAND_DESCRIPTION_LIMIT));

  if (parameters && parameters.length) {
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
      // deno-lint-ignore no-explicit-any
      const buildOption = (option: any) => {
        option.setName(name);

        let finalDescription = description;
        if (defaultValue !== undefined) {
          finalDescription += ` (Default: ${defaultValue})`;
        }

        if (finalDescription) {
          option.setDescription(finalDescription);
        }

        // Discord does not support pre-filled values:
        // the workaround is to make the Discord option required only if
        // there's no default.
        if (required && defaultValue === undefined) {
          option.setRequired(required);
        }

        if (
          (type === "string" || type === "number") &&
          allowedValues &&
          allowedValues.length
        ) {
          option.addChoices(
            ...allowedValues.map((v) => ({ name: String(v), value: v })),
          );
        }

        return option;
      };

      switch (type) {
        case "string":
          builder.addStringOption(buildOption);
          break;
        case "number":
          builder.addNumberOption(buildOption);
          break;
        case "boolean":
          builder.addBooleanOption(buildOption);
          break;
        case "file":
          builder.addAttachmentOption(buildOption);
          break;
      }
    }
  }

  return builder.toJSON();
}
