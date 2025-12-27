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
  APP_USER,
  GEMINI_AVAILABLE,
  GEMINI_EVENT_MODEL,
  GEMINI_MOVIE_MODEL,
  GEMINI_PHOTO_MODEL,
  GEMINI_RATING_MODEL,
  log,
  // GEMINI_SONG_MODEL,
} from "@bott/common";
import {
  movieAction,
  photoAction,
  responseAction,
  // songAction,
} from "@bott/gemini";
import {
  type BottAction,
  BottEvent,
  BottEventType,
  createAction,
} from "@bott/system";
import ejs from "ejs";

const _actions: BottAction[] = [];

if (GEMINI_AVAILABLE) {
  if (GEMINI_EVENT_MODEL && GEMINI_RATING_MODEL) {
    _actions.push(responseAction);
  }

  // TODO: fix
  // if (GEMINI_SONG_MODEL) {
  //   _actions.push(songAction);
  // }

  if (GEMINI_PHOTO_MODEL) {
    _actions.push(photoAction);
  }

  if (GEMINI_MOVIE_MODEL) {
    _actions.push(movieAction);
  }
}

const helpMessage = await Deno.readTextFile(
  new URL("./help.md.ejs", import.meta.url),
);

_actions.push(createAction({
  name: "help",
  instructions: "Show the help menu.",
  shouldForwardOutput: true,
}, async function* () {
  yield new BottEvent(BottEventType.MESSAGE, {
    detail: {
      content: ejs.render(helpMessage, {
        actions: _actions,
        currentVersion: await getVersion(),
      }),
    },
    user: APP_USER,
    channel: this.channel,
  });
}));

export const actions = _actions;

// Common
let _versionCache: string | undefined;
async function getVersion(): Promise<string | undefined> {
  if (_versionCache) return _versionCache;

  try {
    const configText = await Deno.readTextFile(
      new URL("../deno.jsonc", import.meta.url),
    );
    const appDenoConfig = JSON.parse(configText);
    _versionCache = appDenoConfig.version;
  } catch (error) {
    log.warn("Failed to read version from deno.jsonc:", error);
    return;
  }

  return _versionCache;
}
