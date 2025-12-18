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

import {
  GCP_PROJECT,
  GCP_REGION,
  GEMINI_ACCESS_TOKEN,
  GEMINI_SONG_MODEL,
} from "@bott/constants";
import { BottAttachmentType, type BottAction } from "@bott/model";

import { decodeBase64 } from "@std/encoding";
import { createAction } from "../../../infrastructure/actions/module.ts";

const IS_CLOUD_RUN = Boolean(Deno.env.get("K_SERVICE"));

const VERTEX_API_URL =
  `https://${GCP_REGION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT}/locations/${GCP_REGION}/publishers/google/models/${GEMINI_SONG_MODEL}:predict`;

export const songAction: BottAction = createAction(
  async (input, { signal }) => {
    const prompt = input.find((i) => i.name === "prompt")?.value as string;

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const response = await fetch(VERTEX_API_URL, {
      signal,
      method: "POST",
      body: JSON.stringify({
        instances: [
          { prompt },
        ],
      }),
      headers: {
        "Authorization": `Bearer ${await getAccessToken()}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Error generating music: ${response.status} ${await response.text()}`,
      );
    }

    const { predictions } = await response.json();

    return [{
      name: "file",
      value: new File(
        [decodeBase64(predictions[0].bytesBase64Encoded)],
        "song.wav",
        { type: BottAttachmentType.WAV },
      ),
    }];
  },
  {
    name: "song",
    instructions: "Generate a song based on the prompt.",
    schema: {
      input: [{
        name: "prompt",
        type: "string",
        description: "Description of the music/song to generate",
        required: true,
      }],
      output: [{
        name: "file",
        type: "file",
        description: "The generated song file",
      }],
    },
  },
);

async function getAccessToken(): Promise<string> {
  if (IS_CLOUD_RUN) {
    const tokenUrl =
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
    try {
      const response = await fetch(tokenUrl, {
        headers: { "Metadata-Flavor": "Google" },
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch token from metadata server: ${response.status} ${await response
            .text()}`,
        );
      }
      const tokenData = await response.json();
      return tokenData.access_token;
    } catch (error) {
      throw new Error(
        `Could not obtain access token from Cloud Run metadata server.`,
        { cause: error as Error },
      );
    }
  } else {
    if (!GEMINI_ACCESS_TOKEN) {
      throw new Error(
        "GEMINI_ACCESS_TOKEN is not set. Please set it for local development or ensure the app is running in Cloud Run.",
      );
    }

    return GEMINI_ACCESS_TOKEN;
  }
}
