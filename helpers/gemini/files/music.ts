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

import { decodeBase64 } from "jsr:@std/encoding";

import { BottOutputFileType } from "@bott/model";
import { storeOutputFile } from "@bott/storage";

import type { OutputFileGenerator } from "./types.ts";

const GOOGLE_PROJECT_LOCATION = Deno.env.get("GOOGLE_PROJECT_LOCATION") ??
  "us-central1";
const GOOGLE_PROJECT_ID = Deno.env.get("GOOGLE_PROJECT_ID") ??
  "PROJECT_MISSING";
const GOOGLE_ACCESS_TOKEN = Deno.env.get("GOOGLE_ACCESS_TOKEN") ??
  "TOKEN_MISSING";

const IS_CLOUD_RUN = Boolean(Deno.env.get("K_SERVICE"));

const VERTEX_API_URL =
  `https://${GOOGLE_PROJECT_LOCATION}-aiplatform.googleapis.com/v1/projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_PROJECT_LOCATION}/publishers/google/models/lyria-002:predict`;

// NOTE: This stores output files to disk, even if they
// are not in the database yet.
export const generateMusicFile: OutputFileGenerator = async (
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

  const outputFile = storeOutputFile(
    decodeBase64(predictions[0].bytesBase64Encoded),
    BottOutputFileType.WAV,
  );

  return outputFile;
};

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
    if (GOOGLE_ACCESS_TOKEN === "TOKEN_MISSING") {
      throw new Error(
        "GOOGLE_ACCESS_TOKEN is not set. Please set it for local development or ensure the app is running in Cloud Run.",
      );
    }

    return GOOGLE_ACCESS_TOKEN;
  }
}
