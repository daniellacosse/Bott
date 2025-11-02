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

import { PersonGeneration, SafetyFilterLevel } from "@google/genai";
import { decodeBase64 } from "@std/encoding";

import { BottFileType } from "@bott/model";
import { CONFIG_PHOTO_MODEL } from "../constants.ts";

import _gemini from "../client.ts";
import type { BottFileDataGenerator } from "./types.ts";

export const generatePhotoData: BottFileDataGenerator = async (
  prompt: string,
  {
    model = CONFIG_PHOTO_MODEL,
    abortSignal,
    gemini = _gemini,
  },
) => {
  const response = await gemini.models.generateImages({
    model,
    prompt,
    config: {
      abortSignal,
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

  return {
    data: decodeBase64(imageData.image.imageBytes),
    type: BottFileType.PNG,
  };
};
