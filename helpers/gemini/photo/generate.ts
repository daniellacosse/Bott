import { PersonGeneration, SafetyFilterLevel } from "npm:@google/genai";
import { decodeBase64 } from "jsr:@std/encoding";
import { Buffer } from "node:buffer";

import _gemini from "../client.ts";
import type { PromptParameters } from "../types.ts";

export async function generatePhoto(prompt: string, {
  model = "imagen-3.0-generate-002",
  gemini = _gemini,
}: PromptParameters = {}): Promise<Buffer> {
  const response = await gemini.models.generateImages({
    model,
    prompt,
    config: {
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

  return Buffer.from(decodeBase64(imageData.image.imageBytes));
}
