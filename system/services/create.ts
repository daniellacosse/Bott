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
  BottService,
  BottServiceFunction as BottServiceSetupFunction,
  BottServiceSettings,
} from "../types.ts";

export function createService(
  settings: BottServiceSettings,
  setup: BottServiceSetupFunction,
): BottService {
  const { name, ...otherSettings } = settings;

  Object.defineProperty(setup, "name", { value: name });
  Object.assign(setup, otherSettings);

  return setup;
}
