import {
  type CommandObject,
  CommandOptionType,
  createTask,
} from "@bott/discord";
import { generateTextFile } from "@bott/gemini";

export const text: CommandObject = {
  description: `Prompt @Bott for a text response as much as you like.`,
  options: [{
    name: "prompt",
    type: CommandOptionType.STRING,
    description: "Your prompt for @Bott.",
    required: true,
  }],
  command(commandEvent) {
    const taskBucketId = `text-${commandEvent.user?.id}`;
    const prompt = commandEvent.details.prompt;

    console.info(`[INFO] Recieved text prompt "${prompt}".`);

    if (!this.taskManager.has(taskBucketId)) {
      this.taskManager.add({
        name: taskBucketId,
        record: [],
        remainingSwaps: 1,
        config: {
          maximumSequentialSwaps: 1,
        },
      });
    }

    return new Promise((resolve) => {
      this.taskManager.push(
        taskBucketId,
        createTask(async (abortSignal) => {
          resolve({
            ...commandEvent,
            user: this.user,
            details: {
              content: `Here's my text for your prompt: **"${prompt}"**`,
            },
            files: [
              await generateTextFile(prompt, {
                abortSignal,
              }),
            ],
          });
        }),
      );
    });
  },
};
