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
import type { BottAction, BottActionSettings } from "@bott/actions";
import { GEMINI_MOVIE_MODEL, RATE_LIMIT_VIDEOS } from "@bott/constants";
import { BottEventType } from "@bott/model";
import { dispatchEvent } from "@bott/service";
import { prepareAttachmentFromFile } from "@bott/storage";

import {
  type GenerateVideosOperation,
  type GenerateVideosParameters,
  type Image,
  PersonGeneration,
} from "@google/genai";
import { decodeBase64, encodeBase64 } from "@std/encoding/base64";

import _gemini from "../client.ts";

const settings: BottActionSettings = {
  name: "movie",
  instructions: "Generate a movie based on the prompt.",
  limitPerMonth: RATE_LIMIT_VIDEOS,
  parameters: [{
    name: "prompt",
    type: "string",
    description: "Description of the movie scene",
    required: true,
  }, {
    name: "media",
    type: "file",
    description: "Optional reference media for the video generation",
    required: false,
  }],
};

export const movieAction: BottAction = createAction(
  async (parameters, _context) => {
    const { signal } = _context;
    const prompt = parameters.find((p) => p.name === "prompt")?.value as string;
    const media = parameters.find((p) => p.name === "media")?.value as
      | File
      | undefined;

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const request: GenerateVideosParameters = {
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
    };

    if (media?.type.startsWith("image/")) {
      request.image = {
        inlineData: {
          data: encodeBase64(await media.arrayBuffer()),
          mimeType: media.type,
        },
      } as Image;
    } else if (media) {
      throw new Error(
        `Unsupported media type: ${media.type}. Only images are supported.`,
      );
    }

    let operation = await _gemini.models.generateVideos(request);

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
      { type: "video/mp4" },
    );

    // TODO: create result event, attach file, then dispatch
    const attachment = await prepareAttachmentFromFile(
      file,
      _context.id,
    );

    dispatchEvent(
      BottEventType.ACTION_RESULT,
      {
        id: _context.id,
        name: "movie",
        result: {
          attachment,
          prompt,
        },
      },
    );
  },
  settings,
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
