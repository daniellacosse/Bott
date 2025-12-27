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

const SECOND_TO_MS = 1000;
const MINUTE_TO_MS = 60 * SECOND_TO_MS;
const DAY_MS = 24 * 60 * MINUTE_TO_MS;
const FOUR_WEEKS_MS = 4 * 7 * DAY_MS;
const MEGABYTE = 1024 * 1024;

// -- App --
export const APP_NAME = Deno.env.get("APP_NAME") ?? "Bott";
const APP_ID = Deno.env.get("APP_ID") ?? "service:bott";
export const APP_USER = {
  id: APP_ID,
  name: APP_NAME,
};

// -- Services --
export const SERVICE_LIST = readEnv(
  "SERVICE_LIST",
  [APP_NAME, "action", "eventStorage", "discord"],
);

export const SERVICE_DISCORD_TOKEN = Deno.env.get("SERVICE_DISCORD_TOKEN");
export const SERVICE_DISCORD_COMMAND_DESCRIPTION_LIMIT = 100;
export const SERVICE_DISCORD_ATTACHMENT_SIZE_LIMIT = readEnv(
  "SERVICE_DISCORD_ATTACHMENT_SIZE_LIMIT",
  10 * MEGABYTE,
);

// -- Actions --

// Rate Limits
export const ACTION_RATE_LIMIT_WINDOW_MS = FOUR_WEEKS_MS;

export const ACTION_RATE_LIMIT_PHOTOS = readEnv(
  "ACTION_RATE_LIMIT_PHOTOS",
  100,
);
export const ACTION_RATE_LIMIT_SONGS = readEnv(
  "ACTION_RATE_LIMIT_SONGS",
  25,
);
export const ACTION_RATE_LIMIT_VIDEOS = readEnv(
  "ACTION_RATE_LIMIT_VIDEOS",
  10,
);

// Inputs
export const ACTION_PROMPT_LENGTH_LIMIT = 10000;

export const ACTION_RESPONSE_HISTORY_SIZE_MS = readEnv(
  "ACTION_RESPONSE_HISTORY_SIZE_MS",
  DAY_MS,
);
export const ACTION_RESPONSE_DEBOUNCE_MS = readEnv(
  "ACTION_RESPONSE_DEBOUNCE_MS",
  2000,
);
export const ACTION_RESPONSE_EVENT_COUNT_LIMIT = readEnv(
  "ACTION_RESPONSE_EVENT_COUNT_LIMIT",
  2000,
);
export const ACTION_RESPONSE_FILE_TOKEN_LIMIT = readEnv(
  "ACTION_RESPONSE_FILE_TOKEN_LIMIT",
  500_000,
);
export const ACTION_RESPONSE_FILE_COUNT_LIMIT = readEnv(
  "ACTION_RESPONSE_FILE_COUNT_LIMIT",
  1,
);
export const ACTION_RESPONSE_AUDIO_COUNT_LIMIT = readEnv(
  "ACTION_RESPONSE_AUDIO_COUNT_LIMIT",
  1,
);
export const ACTION_RESPONSE_VIDEO_COUNT_LIMIT = readEnv(
  "ACTION_RESPONSE_VIDEO_COUNT_LIMIT",
  10,
);

// Outputs
export const ACTION_RESPONSE_NAME = "response";
export const ACTION_RESPONSE_OUTPUT_WORDS_PER_MINUTE = 200;
export const ACTION_RESPONSE_OUTPUT_TIME_LIMIT_MS = 3 * SECOND_TO_MS;

export const ACTION_MOVIE_ASPECT_RATIO = "16:9";
export const ACTION_MOVIE_FPS = 24;
export const ACTION_MOVIE_RESOLUTION = "720p";
export const ACTION_MOVIE_JOB_INTERVAL_MS = 10000;

// -- Models --

// Gemini
export const GEMINI_AVAILABLE = Boolean(Deno.env.get("GCP_PROJECT"));

export const GEMINI_EVENT_MODEL = readEnv(
  "GEMINI_EVENT_MODEL",
  "gemini-2.5-flash",
);
export const GEMINI_RATING_MODEL = readEnv(
  "GEMINI_RATING_MODEL",
  "gemini-2.5-flash-lite",
);
export const GEMINI_PHOTO_MODEL = readEnv(
  "GEMINI_PHOTO_MODEL",
  "gemini-3-pro-image-preview",
);
export const GEMINI_SONG_MODEL = readEnv(
  "GEMINI_SONG_MODEL",
  "lyria-realtime",
);
export const GEMINI_MOVIE_MODEL = readEnv(
  "GEMINI_MOVIE_MODEL",
  "veo-3.1-fast-generate-001",
);

export const GEMINI_ACCESS_TOKEN = readEnv("GEMINI_ACCESS_TOKEN", "");

// -- Infrastructure & Environment --
export const ENV = readEnv("ENV", "local");
export const PORT = Number(readEnv("PORT", "8080"));
export const OUTPUT_ROOT = readEnv("OUTPUT_ROOT", "./.output");

// GCP
export const GCP_PROJECT = readEnv("GCP_PROJECT", "");
export const GCP_REGION = readEnv("GCP_REGION", "global");
export const GCP_SERVICE_NAME = readEnv("GCP_SERVICE_NAME", `bott-${ENV}`);
export const GCP_ALLOW_UNAUTHENTICATED = readEnv(
  "GCP_ALLOW_UNAUTHENTICATED",
  "true",
);

// Storage
export const STORAGE_ROOT = readEnv(
  "STORAGE_ROOT",
  join(OUTPUT_ROOT, "fsRoot"),
);
export const STORAGE_FILE_ROOT = readEnv(
  "STORAGE_FILE_ROOT",
  join(STORAGE_ROOT, "files"),
);
export const STORAGE_DATA_LOCATION = readEnv(
  "STORAGE_DATA_LOCATION",
  join(STORAGE_ROOT, "data.db"),
);
export const STORAGE_DEPLOY_NONCE_LOCATION = readEnv(
  "STORAGE_DEPLOY_NONCE_LOCATION",
  join(STORAGE_ROOT, ".deployNonce"),
);
export const STORAGE_FILE_SIZE_LIMIT = 50 * MEGABYTE;
export const STORAGE_FILE_WORD_LIMIT = 600;
export const STORAGE_FILE_DIMENSION_LIMIT = 480;
export const STORAGE_FETCH_TIME_LIMIT_MS = 30 * SECOND_TO_MS;
export const STORAGE_FFMPEG_TIME_LIMIT_MS = 5 * MINUTE_TO_MS;

// Log
export const LOG_TOPICS = readEnv(
  "LOG_TOPICS",
  ["info", "warn", "error"],
);
export const LOG_CHARACTER_LIMIT = 4096;

// -- Common --
function readEnv<T>(key: string, defaultValue: T): T {
  const value = Deno.env.get(key);

  if (value === undefined) {
    return defaultValue;
  }

  if (Array.isArray(defaultValue)) {
    return value.split(/,\s*/).map((item) => item.trim()).filter((item) =>
      item.length > 0
    ) as T;
  }

  switch (typeof defaultValue) {
    case "number":
      return Number(value) as T;
    case "boolean":
      return Boolean(value) as T;
    default:
      return value as T;
  }
}
