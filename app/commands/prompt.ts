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

    const response = await generateText(prompt as string, {
      instructions:
        `Try to keep your response under ${DISCORD_MESSAGE_LIMIT} characters.`,
    });

    let result = `
      Here's my response to your prompt: **"${prompt}"**
      
      > ${response}
    `.trim();

    if (result.length > DISCORD_MESSAGE_LIMIT) {
      result = result.slice(0, DISCORD_MESSAGE_LIMIT - 1) + "…";
    }

    return interaction.editReply(result);
  },
};
