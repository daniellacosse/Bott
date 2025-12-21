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

import type { BottService, BottServiceContext } from "./types.ts";

export const createService = (
  service: BottService,
  context: BottServiceContext,
): BottService & { context: BottServiceContext } => {
  return {
    ...service,
    context,
  };
};
