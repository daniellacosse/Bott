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
  GEMINI_EVENT_MODEL,
  GEMINI_MOVIE_MODEL,
  GEMINI_PHOTO_MODEL,
  GEMINI_RATING_MODEL,
  GEMINI_SONG_MODEL,
  MODEL_PROVIDER,
} from "@bott/constants";
import {
  movieAction,
  photoAction,
  responseAction,
  songAction,
} from "@bott/gemini";
import type { BottAction } from "@bott/model";

const actions: Record<string, BottAction> = {};

let provider;

// We only support Gemini for now.
if (MODEL_PROVIDER === "auto") {
  provider = "gemini";
} else {
  provider = MODEL_PROVIDER;
}

if (provider === "gemini") {
  if (GEMINI_EVENT_MODEL && GEMINI_RATING_MODEL) {
    actions.responseAction = responseAction;
  }

  if (GEMINI_SONG_MODEL) {
    actions.songAction = songAction;
  }

  if (GEMINI_PHOTO_MODEL) {
    actions.photoAction = photoAction;
  }

  if (GEMINI_MOVIE_MODEL) {
    actions.movieAction = movieAction;
  }
}

export default actions;
