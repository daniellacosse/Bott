import { BottEventType } from "@bott/data";
import { CommandOptionType, createCommand, createTask } from "@bott/discord";
import { generateMusicFile } from "@bott/gemini";
import { RATE_LIMIT_MUSIC, RATE_LIMIT_WINDOW_MS } from "../constants.ts";

export const music = createCommand<{ prompt: string }>(
  {
    name: "music",
    description:
      `Ask @Bott to generate music: you can generate ${RATE_LIMIT_MUSIC} songs a month. @Bott won't generate music containing lyrics.`,
    options: [{
      name: "prompt",
      type: CommandOptionType.STRING,
      description: "A description of the music you want to generate.",
      required: true,
    }],
  },
  function (commandEvent) {
    const taskBucketId = `music-${commandEvent.user?.id}`;
    const prompt = commandEvent.details.options.prompt;

    console.info(`[INFO] Recieved video prompt "${prompt}".`);

    if (!this.taskManager.has(taskBucketId)) {
      this.taskManager.add({
        name: taskBucketId,
        record: [],
        remainingSwaps: 1,
        config: {
          throttle: {
            limit: RATE_LIMIT_MUSIC,
            windowMs: RATE_LIMIT_WINDOW_MS,
          },
          maximumSequentialSwaps: 1,
        },
      });
    }

    return new Promise((resolve) => {
      this.taskManager.push(
        taskBucketId,
        createTask(async (abortSignal) => {
          resolve({
            id: crypto.randomUUID(),
            type: BottEventType.FUNCTION_RESPONSE,
            user: this.user,
            details: {
              content: `Here's my music for your prompt: **"${prompt}"**`,
            },
            files: [
              await generateMusicFile(prompt, {
                abortSignal,
              }),
            ],
            timestamp: new Date(),
          });
        }),
      );
    });
  },
);
