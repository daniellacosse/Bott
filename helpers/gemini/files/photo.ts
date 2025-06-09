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

import { PersonGeneration, SafetyFilterLevel } from "npm:@google/genai";
import { decodeBase64 } from "jsr:@std/encoding";

import { BottOutputFileType } from "@bott/model";
import { storeOutputFile } from "@bott/storage";

import _gemini from "../client.ts";
import type { OutputFileGenerator } from "./types.ts";

// NOTE: This stores output files to disk, even if they
// are not in the database yet.
export const generatePhotoFile: OutputFileGenerator = async (
  prompt: string,
  {
    model = "imagen-3.0-generate-002",
    abortSignal,
    gemini = _gemini,
  } = {},
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

  const outputFile = storeOutputFile(
    decodeBase64(imageData.image.imageBytes),
    BottOutputFileType.PNG,
  );

  return outputFile;
};
