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
}: InfoEmbedOptions) => {
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
