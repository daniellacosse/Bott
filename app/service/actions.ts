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

import type { BottAction } from "@bott/actions";
import { createAction } from "@bott/actions";
import {
  GEMINI_AVAILABLE,
  GEMINI_EVENT_MODEL,
  GEMINI_MOVIE_MODEL,
  GEMINI_PHOTO_MODEL,
  GEMINI_RATING_MODEL,
  GEMINI_SONG_MODEL,
} from "@bott/constants";
import {
  movieAction,
  photoAction,
  responseAction,
  songAction,
} from "@bott/gemini";

const _actions: Record<string, BottAction> = {};

if (GEMINI_AVAILABLE) {
  if (GEMINI_EVENT_MODEL && GEMINI_RATING_MODEL) {
    _actions[responseAction.name] = responseAction;
  }

  if (GEMINI_SONG_MODEL) {
    _actions[songAction.name] = songAction;
  }

  if (GEMINI_PHOTO_MODEL) {
    _actions[photoAction.name] = photoAction;
  }

  if (GEMINI_MOVIE_MODEL) {
    _actions[movieAction.name] = movieAction;
  }
}

_actions.help = createAction(async function* () {
  // TODO
}, {
  name: "help",
  instructions: "Show help information.",
});

export const actions = _actions;
