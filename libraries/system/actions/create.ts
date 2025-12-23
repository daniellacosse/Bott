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

import type {
  BottAction,
  BottActionFunction,
  BottActionSettings,
} from "@bott/actions";

export function createAction(
  actionFunction: BottActionFunction,
  settings: BottActionSettings,
): BottAction {
  const action = actionFunction;
  const { name, ...otherSettings } = settings;

  Object.defineProperty(action, "name", { value: name });
  Object.assign(action, otherSettings);

  return action as BottAction;
}
