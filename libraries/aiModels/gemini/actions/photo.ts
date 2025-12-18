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
import { GEMINI_PHOTO_MODEL } from "@bott/constants";
import type { BottAction } from "@bott/model";
import {
  type GenerateContentParameters,
  HarmBlockThreshold,
  HarmCategory,
  type Part,
} from "@google/genai";

import { encodeBase64 } from "@std/encoding/base64";

import _gemini from "../client.ts";

export const photoAction: BottAction = createAction(
  async (parameters, { signal }) => {
    const prompt = parameters.find((p) => p.name === "prompt")?.value as string;
    const media = parameters.find((p) => p.name === "media")?.value as
      | File
      | undefined;

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const parts: Part[] = [{ text: prompt }];

    if (media && !media.type.startsWith("image/")) {
      throw new Error(
        `Unsupported media type: ${media.type}. Only images are supported.`,
      );
    }

    if (media) {
      parts.push({
        inlineData: {
          data: encodeBase64(await media.arrayBuffer()),
          mimeType: media.type,
        },
      });
    }

    const request: GenerateContentParameters = {
      model: GEMINI_PHOTO_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        abortSignal: signal,
        candidateCount: 1,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      },
    };

    const response = await _gemini.models.generateContent(request);

    if (!response.candidates?.length) {
      throw new Error("No candidates returned");
    }

    const candidate = response.candidates[0];
    if (
      candidate.finishReason !== "STOP" && candidate.finishReason !== undefined
    ) {
      throw new Error(`Generation stopped: ${candidate.finishReason}`);
    }

    let imageBytes: string | undefined;
    let _mimeType: string | undefined;

    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData) {
        imageBytes = part.inlineData.data;
        _mimeType = part.inlineData.mimeType;
        break;
      }
    }

    if (!imageBytes) {
      throw new Error("No image data found in response");
    }

    // const file = new File(
    //   [decodeBase64(imageData.image.imageBytes)],
    //   "photo.png",
    //   { type: BottAttachmentType.PNG },
    // );

    // TODO: Dispatch event with attachment
  },
  {
    name: "photo",
    instructions: "Generate a photo based on the prompt.",
    parameters: [{
      name: "prompt",
      type: "string",
      description: "Description of the image to generate",
      required: true,
    }, {
      name: "media",
      type: "file",
      description: "Optional reference media for the image generation",
      required: false,
    }],
  },
);
