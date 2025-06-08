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

import { EmbedBuilder } from "npm:discord.js";
import { EmbedColor } from "./colors.ts";

const DESCRIPTION_LENGTH_LIMIT = 4096;

export const createErrorEmbed = (error: Error) => {
  const title = error.name === "Error" ? "Error" : `Error: ${error.name}`;

  let description = `**Message:**\n${error.message || "No message provided."}`;

  if (error.cause) {
    description += `\n\n**Cause:**\n${JSON.stringify(error.cause)}`;
  }

  if (error.stack) {
    description += `\n\n**Stack Trace:**\n\`\`\`\n${error.stack}\n\`\`\``;
  }

  if (description.length > DESCRIPTION_LENGTH_LIMIT) {
    description = description.substring(0, DESCRIPTION_LENGTH_LIMIT - 3) +
      "...";
  }

  return new EmbedBuilder()
    .setColor(EmbedColor.RED)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
};
