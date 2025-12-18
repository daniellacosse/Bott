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

import { GEMINI_PHOTO_MODEL } from "@bott/constants";
import { BottAttachmentType, type BottAction } from "@bott/model";
import { PersonGeneration, SafetyFilterLevel } from "@google/genai";

import { decodeBase64 } from "@std/encoding";
import { createAction } from "../../../infrastructure/actions/module.ts";

import _gemini from "../client.ts";

export const photoAction: BottAction = createAction(
  async (input, { signal }) => {
    const prompt = input.find((i) => i.name === "prompt")?.value as string;

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const response = await _gemini.models.generateImages({
      model: GEMINI_PHOTO_MODEL,
      prompt,
      config: {
        abortSignal: signal,
        addWatermark: true,
        enhancePrompt: true,
        includeRaiReason: true,
        numberOfImages: 1,
        personGeneration: PersonGeneration.ALLOW_ADULT,
        safetyFilterLevel: SafetyFilterLevel.BLOCK_ONLY_HIGH,
      },
    });

    if (!response.generatedImages?.length) {
      throw new Error("No images generated");
    }

    const [imageData] = response.generatedImages;

    if (imageData.raiFilteredReason) {
      throw new Error(`Photo blocked: ${imageData.raiFilteredReason}`);
    }

    if (!imageData.image) {
      throw new Error("No image data");
    }

    if (!imageData.image.imageBytes) {
      throw new Error("No image bytes");
    }

    const file = new File(
      [decodeBase64(imageData.image.imageBytes)],
      "photo.png",
      { type: BottAttachmentType.PNG },
    );

    return [{ name: "file", value: file }];
  },
  {
    name: "photo",
    instructions: "Generate a photo based on the prompt.",
    schema: {
      input: [{
        name: "prompt",
        type: "string",
        description: "Description of the image to generate",
        required: true,
      }],
      output: [{
        name: "file",
        type: "file",
        description: "The generated photo file",
      }],
    },
  },
);
