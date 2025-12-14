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

import { join } from "@std/path";

// Infrastructure & Environment
export const PORT = Number(Deno.env.get("PORT") ?? 8080);
export const LOG_TOPICS = (Deno.env.get("LOG_TOPICS") ?? "info,warn,error")
  .split(",");
export const OUTPUT_ROOT = Deno.env.get("OUTPUT_ROOT") ?? "./.output";
export const STORAGE_ROOT = Deno.env.get("FILE_SYSTEM_ROOT") ??
  join(OUTPUT_ROOT, "fs_root");
export const STORAGE_DEPLOY_NONCE_PATH = join(
  STORAGE_ROOT,
  ".deploy-nonce",
);

// Services

/**
 * A comma-separated list of enabled services.
 * Currently supported: "discord".
 */
export const ENABLED_SERVICES = (Deno.env.get("ENABLED_SERVICES") ?? "discord")
  .split(",")
  .map(s => s.trim());

export const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
export const DISCORD_MESSAGE_LIMIT = 2000;

// Model Configuration

/**
 * The AI model provider to use.
 * - "gemini": Use Gemini if GCP credentials are present.
 * - "auto": Use Gemini if GCP credentials are present.
 */
export const MODEL_PROVIDER = Deno.env.get("MODEL_PROVIDER") ?? "auto";

export const GOOGLE_PROJECT_ID = Deno.env.get("GOOGLE_PROJECT_ID") ??
  Deno.env.get("GCP_PROJECT");
export const GOOGLE_PROJECT_LOCATION =
  Deno.env.get("GOOGLE_PROJECT_LOCATION") ??
    Deno.env.get("GCP_LOCATION");
export const GOOGLE_ACCESS_TOKEN = Deno.env.get("GOOGLE_ACCESS_TOKEN");

const isGeminiAvailable = ["gemini", "auto"].includes(MODEL_PROVIDER) &&
  GOOGLE_PROJECT_ID && GOOGLE_PROJECT_LOCATION && GOOGLE_ACCESS_TOKEN;

export const ERROR_MODEL = Deno.env.get("CONFIG_ERROR_MODEL") ??
  (isGeminiAvailable ? "gemini-2.5-flash" : "not_available");

export const EVENT_MODEL = Deno.env.get("CONFIG_EVENTS_MODEL") ??
  (isGeminiAvailable ? "gemini-2.5-flash" : "not_available");

export const RATING_MODEL = Deno.env.get("CONFIG_RATING_MODEL") ??
  (isGeminiAvailable ? "gemini-2.5-flash-lite" : "not_available");

export const ESSAY_MODEL = Deno.env.get("CONFIG_ESSAY_MODEL") ??
  (isGeminiAvailable ? "gemini-3-pro-preview" : "not_available");

export const PHOTO_MODEL = Deno.env.get("CONFIG_PHOTO_MODEL") ??
  (isGeminiAvailable ? "gemini-3-pro-image-preview" : "not_available");

export const SONG_MODEL = Deno.env.get("CONFIG_SONG_MODEL") ??
  (isGeminiAvailable ? "lyria-002" : "not_available");

export const MOVIE_MODEL = Deno.env.get("CONFIG_MOVIE_MODEL") ??
  (isGeminiAvailable ? "veo-3.1-fast-generate-001" : "not_available");

// App Configuration
export const BOTT_NAME = Deno.env.get("BOTT_NAME") ?? "Bott";
export const BOTT_SERVICE = {
  user: {
    id: Deno.env.get("BOTT_ID") ?? "system:bott",
    name: BOTT_NAME,
  },
};

// Input processing limits
const DAY_MS = 24 * 60 * 60 * 1000;
export const INPUT_FILE_TOKEN_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_FILE_TOKEN_LIMIT") ?? 500_000,
);
export const INPUT_FILE_AUDIO_COUNT_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_FILE_AUDIO_COUNT_LIMIT") ?? 1,
);
export const INPUT_FILE_VIDEO_COUNT_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_FILE_VIDEO_COUNT_LIMIT") ?? 10,
);
export const INPUT_EVENT_COUNT_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_EVENT_COUNT_LIMIT") ?? 2000,
);
export const INPUT_EVENT_TIME_LIMIT_MS = Number(
  Deno.env.get("CONFIG_INPUT_EVENT_TIME_LIMIT_MS") ?? DAY_MS,
);

// Rate Limits
const FOUR_WEEKS_MS = 4 * 7 * DAY_MS;
export const RATE_LIMIT_WINDOW_MS = FOUR_WEEKS_MS;

export const RATE_LIMIT_IMAGES = Number(
  Deno.env.get("CONFIG_RATE_LIMIT_IMAGES") ?? 100,
);
export const RATE_LIMIT_MUSIC = Number(
  Deno.env.get("CONFIG_RATE_LIMIT_MUSIC") ?? 25,
);
export const RATE_LIMIT_VIDEOS = Number(
  Deno.env.get("CONFIG_RATE_LIMIT_VIDEOS") ?? 10,
);
