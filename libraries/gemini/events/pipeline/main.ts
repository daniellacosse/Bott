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

import { focusInput } from "./01_focusInput/main.ts";
import { generateOutput } from "./02_generateOutput/main.ts";
import { segmentOutput } from "./03_segmentOutput/main.ts";
import { filterOutput } from "./04_filterOutput/main.ts";
// import { patchOutput } from "./05_patchOutput/main.ts";

import type { EventPipeline } from "./types.ts";

export * from "./types.ts";

export default [
  focusInput,
  generateOutput,
  segmentOutput,
  filterOutput,
  // patchOutput, // TODO: properly handle metadata
] as EventPipeline;
