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
import { ACTION_RATE_LIMIT_PHOTOS, APP_USER, GEMINI_PHOTO_MODEL } from "@bott/constants";
import { BottEvent, BottEventType } from "@bott/events";
import { prepareAttachmentFromFile } from "@bott/storage";
import {
  type GenerateContentParameters,
  HarmBlockThreshold,
  HarmCategory,
  type Part,
} from "@google/genai";

import { decodeBase64, encodeBase64 } from "@std/encoding/base64";

import gemini from "../client.ts";
import { generateFilename } from "./common.ts";

const settings: BottActionSettings = {
  name: "photo",
  instructions: "Generate a photo based on the prompt.",
  limitPerMonth: ACTION_RATE_LIMIT_PHOTOS,
  shouldForwardOutput: true,
  parameters: [{
    name: "prompt",
    type: "string",
    description: "Description of the image to generate",
    required: true,
  }, {
    name: "media",
    type: "file",
    description:
      "Optional reference media for the image generation (image or text).",
    required: false,
  }],
};

export const photoAction: BottAction = createAction(
  async function* ({ prompt, media }) {
    if (!GEMINI_PHOTO_MODEL) {
      throw new Error(
        "Gemini photo model is not configured. Please ensure `GEMINI_PHOTO_MODEL` is set in your environment.",
      );
    }

    const promptString = prompt as string;
    const mediaFile = media as File;

    const parts: Part[] = [{ text: promptString }];

    switch (mediaFile.type) {
      case "image/jpeg":
      case "image/png":
      case "image/webp":
      case "image/gif":
      case "image/bmp":
      case "image/tiff":
      case "image/svg+xml":
        parts.push({
          inlineData: {
            data: encodeBase64(await mediaFile.arrayBuffer()),
            mimeType: mediaFile.type,
          },
        });
        break;
      case "text/plain":
      case "text/markdown":
        parts.push({ text: await mediaFile.text() });
        break;
      default:
        throw new Error(
          `Unsupported media type: ${mediaFile.type}. Only images and text are supported.`,
        );
    }

    const request: GenerateContentParameters = {
      model: GEMINI_PHOTO_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        abortSignal: this.signal,
        candidateCount: 1,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      },
    };

    const response = await gemini.models.generateContent(request);

    const imagePart = response.candidates![0].content!.parts!.find((
      part,
    ) => part.inlineData)!;

    const file = new File(
      [decodeBase64(imagePart.inlineData!.data!)],
      generateFilename("png", promptString),
      { type: imagePart.inlineData!.mimeType },
    );

    const resultEvent = new BottEvent(
      BottEventType.MESSAGE,
      {
        user: APP_USER,
        channel: this.channel,
      },
    );

    const attachment = await prepareAttachmentFromFile(
      file,
      resultEvent,
    );

    resultEvent.attachments = [attachment];

    yield resultEvent;
  },
  settings,
);
