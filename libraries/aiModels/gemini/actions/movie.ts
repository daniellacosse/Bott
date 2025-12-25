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
import {
  ACTION_MOVIE_ASPECT_RATIO,
  ACTION_MOVIE_FPS,
  ACTION_MOVIE_JOB_INTERVAL_MS,
  ACTION_MOVIE_RESOLUTION,
  ACTION_RATE_LIMIT_VIDEOS,
  APP_USER,
  GEMINI_MOVIE_MODEL,
} from "@bott/constants";
import { BottEvent, BottEventType } from "@bott/events";
import { log } from "@bott/log";
import { prepareAttachmentFromFile } from "@bott/storage";
import {
  type GenerateVideosParameters,
  type Image,
  PersonGeneration,
} from "@google/genai";
import { decodeBase64, encodeBase64 } from "@std/encoding/base64";

import gemini from "../client.ts";
import { generateFilename } from "./common.ts";

const settings: BottActionSettings = {
  name: "movie",
  instructions: "Generate a movie based on the prompt.",
  limitPerMonth: ACTION_RATE_LIMIT_VIDEOS,
  shouldForwardOutput: true,
  parameters: [{
    name: "prompt",
    type: "string",
    description: "Description of the movie scene",
    required: true,
  }, {
    name: "media",
    type: "file",
    description:
      "Optional reference media for the video generation (image or text)",
    required: false,
  }],
};

export const movieAction: BottAction = createAction(
  async function* ({ prompt, media }) {
    if (!GEMINI_MOVIE_MODEL) {
      throw new Error(
        "Gemini movie model is not configured. Please ensure `GEMINI_MOVIE_MODEL` is set in your environment.",
      );
    }

    let promptString = prompt as string;
    let mediaData: Image | undefined;

    if (media) {
      const mediaFile = media as File;
      switch (mediaFile.type) {
        case "image/jpeg":
        case "image/png":
        case "image/gif":
        case "image/webp":
        case "image/avif":
        case "image/svg+xml": {
          mediaData = {
            imageBytes: encodeBase64(await mediaFile.arrayBuffer()),
            mimeType: mediaFile.type,
          } as Image;
          break;
        }
        case "text/plain":
        case "text/markdown":
          promptString += `\n\nAttachment: ${await mediaFile.text()}`;
          break;
        default:
          throw new Error(
            `movieAction: Unsupported media type: ${mediaFile.type}. Only images are supported.`,
          );
      }
    }

    const file = await _doVideoJob({
      model: GEMINI_MOVIE_MODEL,
      prompt: promptString,
      image: mediaData,
      config: {
        abortSignal: this.signal,
        aspectRatio: ACTION_MOVIE_ASPECT_RATIO,
        enhancePrompt: true,
        fps: ACTION_MOVIE_FPS,
        numberOfVideos: 1,
        personGeneration: PersonGeneration.ALLOW_ADULT,
        resolution: ACTION_MOVIE_RESOLUTION,
      },
    });

    const resultEvent = new BottEvent(
      BottEventType.MESSAGE,
      {
        user: APP_USER,
        channel: this.channel,
      },
    );

    resultEvent.attachments = [
      await prepareAttachmentFromFile(
        file,
        resultEvent,
      ),
    ];

    yield resultEvent;
  },
  settings,
);

async function _doVideoJob(
  job: GenerateVideosParameters,
): Promise<File> {
  let operation = await gemini.models.generateVideos(job);

  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      try {
        if (operation.done) {
          const file = new File(
            [decodeBase64(
              operation.response!.generatedVideos![0].video!.videoBytes!,
            )],
            generateFilename("mp4", job.prompt),
            { type: "video/mp4" },
          );
          resolve(file);
          return clearInterval(intervalId);
        }

        operation = await gemini.operations.getVideosOperation({ operation });
        log.debug("Movie job progress", operation);
      } catch (error) {
        reject(error);
        return clearInterval(intervalId);
      }
    }, ACTION_MOVIE_JOB_INTERVAL_MS);
  });
}
