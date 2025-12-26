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

import type { BottAction, BottActionSettings } from "@bott/actions";
import { createAction } from "@bott/actions";
import {
  APP_USER,
  GEMINI_AVAILABLE,
  GEMINI_EVENT_MODEL,
  GEMINI_MOVIE_MODEL,
  GEMINI_PHOTO_MODEL,
  GEMINI_RATING_MODEL,
  // GEMINI_SONG_MODEL,
} from "@bott/constants";
import { BottEvent, BottEventType } from "@bott/events";
import {
  movieAction,
  photoAction,
  responseAction,
  // songAction,
} from "@bott/gemini";
import ejs from "ejs";

const _actions: Record<string, BottAction> = {};

if (GEMINI_AVAILABLE) {
  if (GEMINI_EVENT_MODEL && GEMINI_RATING_MODEL) {
    _actions[responseAction.name] = responseAction;
  }

  // TODO: fix
  // if (GEMINI_SONG_MODEL) {
  //   _actions[songAction.name] = songAction;
  // }

  if (GEMINI_PHOTO_MODEL) {
    _actions[photoAction.name] = photoAction;
  }

  if (GEMINI_MOVIE_MODEL) {
    _actions[movieAction.name] = movieAction;
  }
}

const helpMessage = (await Deno.readTextFile(
  new URL("./help.md.ejs", import.meta.url),
)).replaceAll("<!-- deno-fmt-ignore-file -->\n", "");

const helpSettings: BottActionSettings = {
  name: "help",
  instructions: "Show the help menu.",
  shouldForwardOutput: true,
};

_actions.help = createAction(async function* () {
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
}, helpSettings);

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
    console.warn("Failed to read version from deno.jsonc:", error);
    return;
  }

  return _versionCache;
}
