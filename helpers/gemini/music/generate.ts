import { Buffer } from "node:buffer";
import { decodeBase64 } from "jsr:@std/encoding";
import { PromptParameters } from "../types.ts";

const GOOGLE_PROJECT_LOCATION = Deno.env.get("GOOGLE_PROJECT_LOCATION") ??
  "us-central1";
const GOOGLE_PROJECT_ID = Deno.env.get("GOOGLE_PROJECT_ID") ??
  "PROJECT_MISSING";
const GOOGLE_ACCESS_TOKEN = Deno.env.get("GOOGLE_ACCESS_TOKEN") ??
  "TOKEN_MISSING";

const VERTEX_API_URL =
  `https://${GOOGLE_PROJECT_LOCATION}-aiplatform.googleapis.com/v1/projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_PROJECT_LOCATION}/publishers/google/models/lyria-002:predict`;

export async function generateMusic(
  prompt: string,
  { abortSignal }: PromptParameters = {},
): Promise<Buffer> {
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

  return Buffer.from(
    decodeBase64(predictions[0].bytesBase64Encoded),
  );
}
