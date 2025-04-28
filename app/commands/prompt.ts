import { type CommandObject, CommandOptionType } from "@bott/discord";
import { generateText } from "@bott/gemini";
import { DISCORD_MESSAGE_LIMIT } from "../constants.ts";

export const prompt: CommandObject = {
  description:
    `Prompt @Bott directly as much as you like. Remember that Discord limits messages to ${DISCORD_MESSAGE_LIMIT} characters.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "Your prompt or question for @Bott.",
    required: true,
  }],
  async command(interaction) {
    const prompt = interaction.options.get("prompt")!.value as string;

    console.info(`[INFO] Recieved text prompt "${prompt}".`);

    const response = await generateText(prompt as string, {
      characterLimit: DISCORD_MESSAGE_LIMIT,
      instructions:
        // We already set a hard character limit, but it can't hurt.
        `Try to keep your response under ${DISCORD_MESSAGE_LIMIT} characters.`,
    });

    return interaction.editReply(
      `
      Here's my response to your prompt: **"${prompt}"**
      
      ${
        // Gemini likes to use triple carriage returns in highly structured responses
        // that don't translate well to discord
        response.replaceAll("\n\n\n", "\n\n").split("\n").map((line) =>
          `> ${line}`
        )
          .join("\n")}
    `.trim().slice(0, DISCORD_MESSAGE_LIMIT),
    );
  },
};
