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

import type { BottReason } from "./reasons.ts";

/**
 * Defines the structure for global settings in Bott.
 * These settings apply across all spaces and channels unless overridden.
 */
export interface BottResponseSettings {
  identity: string;
  reasons: {
    input: BottReason[];
    output: BottReason[];
  };
}
