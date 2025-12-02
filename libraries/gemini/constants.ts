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
  Deno.env.get("CONFIG_INPUT_EVENT_TIME_LIMIT_MS") ?? 24 * 60 * 60 * 1000,
);

export const ERROR_MODEL = Deno.env.get("CONFIG_ERROR_MODEL") ??
  "gemini-2.5-flash";

export const EVENT_MODEL = Deno.env.get("CONFIG_EVENTS_MODEL") ??
  "gemini-2.5-flash";

export const RATING_MODEL = Deno.env.get("CONFIG_RATING_MODEL") ??
  "gemini-2.5-flash-lite";

export const ESSAY_MODEL = Deno.env.get("CONFIG_ESSAY_MODEL") ??
  "gemini-3-pro-preview";

export const PHOTO_MODEL = Deno.env.get("CONFIG_PHOTO_MODEL") ??
  "gemini-3-pro-image-preview";

export const SONG_MODEL = Deno.env.get("CONFIG_SONG_MODEL") ??
  "lyria-002";

export const MOVIE_MODEL = Deno.env.get("CONFIG_MOVIE_MODEL") ??
  "veo-3.1-fast-generate-001";
