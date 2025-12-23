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

import type { NonEmptyArray } from "./common.ts";

/**
 * Defines the structure for a "Rating Scale" in Bott.
 * Rating scales are used to describe characteristics of events or entities,
 * with a 1-5 scale rating system.
 */
export interface BottRatingScale {
  name: string;
  definition: string;
  examples: {
    1: NonEmptyArray<string>;
    2?: NonEmptyArray<string>;
    3?: NonEmptyArray<string>;
    4?: NonEmptyArray<string>;
    5: NonEmptyArray<string>;
  };
}

/**
 * Defines the structure for a "Reason" in Bott.
 * Rules are conditions or actions that Bott must take based on rating scale results.
 */
export interface BottReason {
  name: string;
  description: string;
  instruction?: string;
  ratingScales?: NonEmptyArray<BottRatingScale>;
  validator: (metadata?: { ratings?: Record<string, number> }) => boolean;
}
