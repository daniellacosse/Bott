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

type InfoEmbedOptions = {
  description?: string;
  fields?: {
    name: string;
    value: string;
  }[];
  footer?: string;
};

export const createInfoEmbed = (title: string, {
  description,
  fields,
  footer,
}: InfoEmbedOptions): EmbedBuilder => {
  const embed = new EmbedBuilder().setColor(EmbedColor.BLUE).setTitle(title);

  if (description) {
    embed.setDescription(description);
  }

  if (fields) {
    embed.addFields(...fields);
  }

  if (footer) {
    embed.setFooter({ text: footer });
  }

  return embed;
};
