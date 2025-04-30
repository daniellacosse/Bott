// TODO: encapsulate these concepts in infra
import { AttachmentBuilder } from "npm:discord.js";

import { type CommandObject, CommandOptionType } from "@bott/discord";
import { generateText } from "@bott/gemini";

export const text: CommandObject = {
  description: `Prompt @Bott for a text response as much as you like.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "Your prompt for @Bott.",
    required: true,
  }],
  async command(interaction) {
    const prompt = interaction.options.get("prompt")!.value as string;

    console.info(`[INFO] Recieved text prompt "${prompt}".`);

    return interaction.editReply({
      content: `Here's my response to your text prompt: **"${prompt}"**`,
      files: [
        new AttachmentBuilder(await generateText(prompt), {
          name: "generated.txt",
        }),
      ],
    });
  },
};
