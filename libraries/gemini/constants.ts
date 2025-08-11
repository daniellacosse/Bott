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

export const CONFIG_ASSESSMENT_SCORE_THRESHOLD = Number(
  Deno.env.get("CONFIG_ASSESSMENT_SCORE_THRESHOLD") ?? 70,
);

export const INPUT_FILE_TOKEN_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_FILE_TOKEN_LIMIT") ?? 500_000,
);

export const INPUT_FILE_AUDIO_COUNT_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_FILE_AUDIO_COUNT_LIMIT") ?? 1,
);

export const INPUT_FILE_VIDEO_COUNT_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_FILE_VIDEO_COUNT_LIMIT") ?? 10,
);

export const INPUT_EVENT_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_EVENT_LIMIT") ?? 2000,
);

export const CONFIG_ESSAY_MODEL = Deno.env.get("CONFIG_ESSAY_MODEL") ?? "gemini-2.5-pro";

export const CONFIG_EVENTS_MODEL = Deno.env.get("CONFIG_EVENTS_MODEL") ?? "gemini-2.5-flash";

export const CONFIG_ASSESSMENT_MODEL = Deno.env.get("CONFIG_ASSESSMENT_MODEL") ?? "gemini-2.5-flash-lite";

export const CONFIG_ERROR_MODEL = Deno.env.get("CONFIG_ERROR_MODEL") ?? "gemini-2.5-flash";

export const CONFIG_PHOTO_MODEL = Deno.env.get("CONFIG_PHOTO_MODEL") ?? "imagen-4.0-generate-preview-06-06";

export const CONFIG_SONG_MODEL = Deno.env.get("CONFIG_SONG_MODEL") ?? "lyria-002";

export const CONFIG_MOVIE_MODEL = Deno.env.get("CONFIG_MOVIE_MODEL") ?? "veo-3.0-generate-preview";
