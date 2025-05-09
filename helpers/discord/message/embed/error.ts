import { EmbedBuilder } from "npm:discord.js";
import { EmbedColor } from "./colors.ts";
import { DESCRIPTION_LENGTH_LIMIT } from "../constants.ts";

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
