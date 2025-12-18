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

import { createAction } from "@bott/actions";
import { GEMINI_MOVIE_MODEL } from "@bott/constants";
import { BottAttachmentType, type BottAction } from "@bott/model";

import { type GenerateVideosOperation, PersonGeneration } from "@google/genai";
import { decodeBase64 } from "@std/encoding";

import _gemini from "../client.ts";

export const movieAction: BottAction = createAction(
  async (input, { signal }) => {
    const prompt = input.find((i) => i.name === "prompt")?.value as string;

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    let operation = await _gemini.models.generateVideos({
      model: GEMINI_MOVIE_MODEL,
      prompt,
      config: {
        abortSignal: signal,
        aspectRatio: "16:9",
        enhancePrompt: true,
        fps: 24,
        numberOfVideos: 1,
        personGeneration: PersonGeneration.ALLOW_ADULT,
        resolution: "720p",
      },
    });

    operation = await _doVideoJob(operation, _gemini);

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

    const file = new File(
      [decodeBase64(videoData.video.videoBytes)],
      "movie.mp4",
      { type: BottAttachmentType.MP4 },
    );

    return [{ name: "file", value: file }];
  },
  {
    name: "movie",
    instructions: "Generate a movie based on the prompt.",
    schema: {
      input: [{
        name: "prompt",
        type: "string",
        description: "Description of the movie scene",
        required: true,
      }],
      output: [{
        name: "file",
        type: "file",
        description: "The generated movie file",
      }],
    },
  },
);

function _doVideoJob(
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
