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
  Deno.env.get("CONFIG_ASSESSMENT_SCORE_THRESHOLD") ?? 50,
);

export const INPUT_FILE_TOKEN_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_FILE_TOKEN_LIMIT") ?? 500_000,
);

export const INPUT_EVENT_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_EVENT_LIMIT") ?? 2000,
);
