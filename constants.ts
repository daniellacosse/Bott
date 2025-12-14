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

// -- Infrastructure & Environment --
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

// Storage & Processing
export const STORAGE_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const STORAGE_FETCH_TIMEOUT_MS = 30 * 1000;
export const STORAGE_MAX_TEXT_FILE_WORDS = 600;
export const STORAGE_FFMPEG_TIMEOUT_MS = 5 * 60 * 1000;
export const STORAGE_MAX_ATTACHMENT_DIMENSION = 480;

// Logger
export const LOGGER_TRUNCATE_LENGTH = 100;

// -- Actions --
export const ACTION_DEFAULT_RESPONSE_SWAPS = 6;
export const ACTION_MAX_PROMPT_LENGTH = 10000;

// Rate Limits
const DAY_MS = 24 * 60 * 60 * 1000;
const FOUR_WEEKS_MS = 4 * 7 * DAY_MS;
export const RATE_LIMIT_WINDOW_MS = FOUR_WEEKS_MS;

export const RATE_LIMIT_IMAGES = Number(
  Deno.env.get("RATE_LIMIT_IMAGES") ?? 100,
);
export const RATE_LIMIT_MUSIC = Number(
  Deno.env.get("RATE_LIMIT_MUSIC") ?? 25,
);
export const RATE_LIMIT_VIDEOS = Number(
  Deno.env.get("RATE_LIMIT_VIDEOS") ?? 10,
);

// -- Services --

/**
 * A comma-separated list of enabled services.
 * Currently supported: "discord".
 */
export const ENABLED_SERVICES = (Deno.env.get("ENABLED_SERVICES") ?? "discord")
  .split(",")
  .map((s) => s.trim());

export const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
export const DISCORD_MESSAGE_LIMIT = 2000;

// -- Models --

/**
 * The model provider to use.
 * - "gemini": Explicitly select Gemini (requires GCP credentials).
 * - "auto": Automatically select the best available provider (currently behaves the same as "gemini" and uses Gemini if GCP credentials are present).
 *
 * Note: Both "gemini" and "auto" currently use Gemini if GCP credentials are present.
 * The "auto" option is reserved for future extensibility, where additional providers may be supported.
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

export const ERROR_MODEL = Deno.env.get("ERROR_MODEL") ??
  (isGeminiAvailable ? "gemini-2.5-flash" : "not_available");

export const EVENT_MODEL = Deno.env.get("EVENTS_MODEL") ??
  (isGeminiAvailable ? "gemini-2.5-flash" : "not_available");

export const RATING_MODEL = Deno.env.get("RATING_MODEL") ??
  (isGeminiAvailable ? "gemini-2.5-flash-lite" : "not_available");

export const ESSAY_MODEL = Deno.env.get("ESSAY_MODEL") ??
  (isGeminiAvailable ? "gemini-3-pro-preview" : "not_available");

export const PHOTO_MODEL = Deno.env.get("PHOTO_MODEL") ??
  (isGeminiAvailable ? "gemini-3-pro-image-preview" : "not_available");

export const SONG_MODEL = Deno.env.get("SONG_MODEL") ??
  (isGeminiAvailable ? "lyria-002" : "not_available");

export const MOVIE_MODEL = Deno.env.get("MOVIE_MODEL") ??
  (isGeminiAvailable ? "veo-3.1-fast-generate-001" : "not_available");

// Input processing limits
export const INPUT_FILE_TOKEN_LIMIT = Number(
  Deno.env.get("INPUT_FILE_TOKEN_LIMIT") ?? 500_000,
);
export const INPUT_FILE_AUDIO_COUNT_LIMIT = Number(
  Deno.env.get("INPUT_FILE_AUDIO_COUNT_LIMIT") ?? 1,
);
export const INPUT_FILE_VIDEO_COUNT_LIMIT = Number(
  Deno.env.get("INPUT_FILE_VIDEO_COUNT_LIMIT") ?? 10,
);
export const INPUT_EVENT_COUNT_LIMIT = Number(
  Deno.env.get("INPUT_EVENT_COUNT_LIMIT") ?? 2000,
);
export const INPUT_EVENT_TIME_LIMIT_MS = Number(
  Deno.env.get("INPUT_EVENT_TIME_LIMIT_MS") ?? DAY_MS,
);

// -- App --
export const BOTT_NAME = Deno.env.get("BOTT_NAME") ?? "Bott";
const BOTT_ID = Deno.env.get("BOTT_ID") ?? "system:bott";
export const BOTT_SERVICE = {
  user: {
    id: BOTT_ID,
    name: BOTT_NAME,
  },
};

export const TYPING_WORDS_PER_MINUTE = 200;
export const TYPING_MAX_TIME_MS = 3000;
