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

// Application Constants
export const BOTT_NAME = Deno.env.get("BOTT_NAME") ?? "Bott";
export const BOTT_ID = Deno.env.get("BOTT_ID") ?? "system:bott";

export const BOTT_USER = {
  id: BOTT_ID,
  name: BOTT_NAME,
};

export const DISCORD_MESSAGE_LIMIT = 2000;

/** The port of the health check server required for GCP Cloud Run. */
export const PORT = Number(Deno.env.get("PORT") ?? 8080);

/** Controls which log topics to display. Comma-separated list of topics: debug, info, warn, error, perf. */
export const LOG_TOPICS = Deno.env.get("LOG_TOPICS") ?? "info,warn,error";

// Cloud Configuration

/** The authentication token for your Discord bot application. */
export const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");

/** The ID of your Google Cloud project. */
export const GOOGLE_PROJECT_ID = Deno.env.get("GOOGLE_PROJECT_ID") ??
  Deno.env.get("GCP_PROJECT");

/** The GCP region where your Vertex AI resources are located. */
export const GOOGLE_PROJECT_LOCATION =
  Deno.env.get("GOOGLE_PROJECT_LOCATION") ??
    Deno.env.get("GCP_LOCATION");

/** An access token for authenticating with Google Cloud APIs (for local development). */
export const GOOGLE_ACCESS_TOKEN = Deno.env.get("GOOGLE_ACCESS_TOKEN");

/** The root directory on the local file system for storing input and output files. */
export const STORAGE_ROOT = Deno.env.get("FILE_SYSTEM_ROOT") ?? "./fs_root";
export const STORAGE_DEPLOY_NONCE_PATH = join(
  STORAGE_ROOT,
  ".deploy-nonce",
);

// Rate Limits
const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;
export const RATE_LIMIT_WINDOW_MS = FOUR_WEEKS_MS;

/** The maximum number of images Bott can generate per month. */
export const RATE_LIMIT_IMAGES = Number(
  Deno.env.get("CONFIG_RATE_LIMIT_IMAGES") ?? 100,
);

/** The maximum number of songs Bott can generate per month. */
export const RATE_LIMIT_MUSIC = Number(
  Deno.env.get("CONFIG_RATE_LIMIT_MUSIC") ?? 25,
);

/** The maximum number of videos Bott can generate per month. */
export const RATE_LIMIT_VIDEOS = Number(
  Deno.env.get("CONFIG_RATE_LIMIT_VIDEOS") ?? 10,
);

// Input processing limits

/** The maximum number of tokens to use for analyzing the content of input files. */
export const INPUT_FILE_TOKEN_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_FILE_TOKEN_LIMIT") ?? 500_000,
);

/** The maximum number of audio files to analyze per input. */
export const INPUT_FILE_AUDIO_COUNT_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_FILE_AUDIO_COUNT_LIMIT") ?? 1,
);

/** The maximum number of video files to analyze per input. */
export const INPUT_FILE_VIDEO_COUNT_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_FILE_VIDEO_COUNT_LIMIT") ?? 10,
);

/** The maximum number of past chat events to include in the context for the AI model. */
export const INPUT_EVENT_COUNT_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_EVENT_COUNT_LIMIT") ?? 2000,
);

/** The maximum age (in ms) of past chat events to include in the context. */
export const INPUT_EVENT_TIME_LIMIT_MS = Number(
  Deno.env.get("CONFIG_INPUT_EVENT_TIME_LIMIT_MS") ?? 24 * 60 * 60 * 1000,
);

// Models

/** The AI model used for generating user-friendly error messages. */
export const ERROR_MODEL = Deno.env.get("CONFIG_ERROR_MODEL") ??
  "gemini-2.5-flash";

/** The AI model used for generating responses to chat events and user messages. */
export const EVENT_MODEL = Deno.env.get("CONFIG_EVENTS_MODEL") ??
  "gemini-2.5-flash";

/** The AI model used for rating events and potential responses. */
export const RATING_MODEL = Deno.env.get("CONFIG_RATING_MODEL") ??
  "gemini-2.5-flash-lite";

/** The AI model used for generating essays and long-form text content. */
export const ESSAY_MODEL = Deno.env.get("CONFIG_ESSAY_MODEL") ??
  "gemini-3-pro-preview";

/** The AI model used for generating images. */
export const PHOTO_MODEL = Deno.env.get("CONFIG_PHOTO_MODEL") ??
  "gemini-3-pro-image-preview";

/** The AI model used for generating music and audio content. */
export const SONG_MODEL = Deno.env.get("CONFIG_SONG_MODEL") ??
  "lyria-002";

/** The AI model used for generating video content. */
export const MOVIE_MODEL = Deno.env.get("CONFIG_MOVIE_MODEL") ??
  "veo-3.1-fast-generate-001";
