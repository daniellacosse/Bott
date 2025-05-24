import { PersonGeneration, SafetyFilterLevel } from "npm:@google/genai";
import { decodeBase64 } from "jsr:@std/encoding";

import { BottFileMimetypes } from "@bott/data";

import _gemini from "../client.ts";
import type { FileGenerator } from "./types.ts";
import { getPromptSlug } from "../prompt.ts";

export const generatePhotoFile: FileGenerator = async (prompt: string, {
  model = "imagen-3.0-generate-002",
  abortSignal,
  gemini = _gemini,
} = {}) => {
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

  const fileName = `${getPromptSlug(prompt)}.png`;
  const fileData = decodeBase64(imageData.image.imageBytes);

  return {
    id: crypto.randomUUID(),
    data: fileData,
    name: fileName,
    url: new URL("file://"),
    mimetype: BottFileMimetypes.PNG,
  };
};
