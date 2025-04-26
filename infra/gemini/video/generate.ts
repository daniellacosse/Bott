import {
  type GenerateVideosOperation,
  PersonGeneration,
} from "npm:@google/genai";
import { decodeBase64 } from "jsr:@std/encoding";

import _gemini from "../client.ts";
import type { PromptParameters } from "../types.ts";

function doVideoJob(
  job: GenerateVideosOperation,
  gemini = _gemini,
): Promise<GenerateVideosOperation> {
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      if (job.done) {
        resolve(job);
        return clearInterval(intervalId);
      }

      try {
        job = await gemini.operations.getVideosOperation({ operation: job });
      } catch (error) {
        reject(error);
        return clearInterval(intervalId);
      }
    }, 10000);
  });
}

export async function generateVideo(
  prompt: string,
  { model = "veo-2.0-generate-001", gemini = _gemini }: PromptParameters = {},
) {
  let operation = await gemini.models.generateVideos({
    model,
    prompt,
    config: {
      aspectRatio: "16:9",
      enhancePrompt: true,
      fps: 24,
      numberOfVideos: 1,
      durationSeconds: 5, // to keep it under Discord's 8MB limit
      personGeneration: PersonGeneration.ALLOW_ADULT,
      resolution: "720p",
    },
  });

  operation = await doVideoJob(operation, gemini);

  if (operation.error) {
    throw new Error(
      `Error generating video: ${JSON.stringify(operation.error)}`,
    );
  }

  if (!operation.response) {
    throw new Error("No response");
  }

  if (
    !operation.response.generatedVideos ||
    !operation.response.generatedVideos.length
  ) {
    throw new Error("No videos generated");
  }

  const [videoData] = operation.response.generatedVideos;

  if (!videoData.video) {
    throw new Error("No video data");
  }

  if (!videoData.video.videoBytes) {
    throw new Error("No video bytes");
  }

  return decodeBase64(videoData.video.videoBytes);
}
