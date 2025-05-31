import { decodeBase64 } from "jsr:@std/encoding";

import { BottAssetType } from "@bott/model";

import type { FileGenerator } from "./types.ts";
import { getFileNameFromDescription, getGeneratedFileUrl } from "./url.ts";

const GOOGLE_PROJECT_LOCATION = Deno.env.get("GOOGLE_PROJECT_LOCATION") ??
  "us-central1";
const GOOGLE_PROJECT_ID = Deno.env.get("GOOGLE_PROJECT_ID") ??
  "PROJECT_MISSING";
const GOOGLE_ACCESS_TOKEN = Deno.env.get("GOOGLE_ACCESS_TOKEN") ??
  "TOKEN_MISSING";

const VERTEX_API_URL =
  `https://${GOOGLE_PROJECT_LOCATION}-aiplatform.googleapis.com/v1/projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_PROJECT_LOCATION}/publishers/google/models/lyria-002:predict`;

export const generateMusicFile: FileGenerator = async (
  prompt,
  { abortSignal } = {},
) => {
  const response = await fetch(VERTEX_API_URL, {
    signal: abortSignal,
    method: "POST",
    body: JSON.stringify({
      instances: [
        { prompt },
      ],
    }),
    headers: {
      "Authorization": `Bearer ${GOOGLE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  const { predictions } = await response.json();

  const fileName = `${getFileNameFromDescription(prompt)}.wav`;
  const fileData = decodeBase64(predictions[0].bytesBase64Encoded);

  return {
    id: crypto.randomUUID(),
    data: fileData,
    name: fileName,
    description: prompt,
    url: getGeneratedFileUrl(fileName),
    type: BottAssetType.WAV,
  };
};
