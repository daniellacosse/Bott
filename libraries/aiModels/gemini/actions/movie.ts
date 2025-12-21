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

import {
  type BottAction,
  BottActionEventType,
  type BottActionSettings,
  createAction,
} from "@bott/actions";
import { GEMINI_MOVIE_MODEL, RATE_LIMIT_VIDEOS } from "@bott/constants";
import { BottServiceEvent } from "@bott/service";
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
    // ...
  }],
};

export const movieAction: BottAction = createAction(
  async function* ({ prompt, media }) {
    if (!GEMINI_MOVIE_MODEL) {
      throw new Error("Gemini movie model is not configured");
    }

    const request: GenerateVideosParameters = {
      model: GEMINI_MOVIE_MODEL,
      prompt: prompt as string,
      config: {
        abortSignal: this.signal,
        aspectRatio: "16:9",
        enhancePrompt: true,
        fps: 24,
        numberOfVideos: 1,
        personGeneration: PersonGeneration.ALLOW_ADULT,
        resolution: "720p",
      },
    };

    if ((media as File)?.type.startsWith("image/")) {
      request.image = {
        inlineData: {
          data: encodeBase64(await (media as File).arrayBuffer()),
          mimeType: (media as File).type,
        },
      } as Image;
    } else if (media) {
      throw new Error(
        `Unsupported media type: ${(media as File)?.type
        }. Only images are supported.`,
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

    const resultEvent = new BottServiceEvent(
      BottActionEventType.ACTION_OUTPUT,
      {
        detail: {
          id: this.id,
          name: "movie"
        },
      },
    );

    resultEvent.attachments = [await prepareAttachmentFromFile(
      file,
      resultEvent,
    )];

    yield resultEvent;
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
