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

import { GoogleGenAI } from "@google/genai";
import { GOOGLE_PROJECT_ID, GOOGLE_PROJECT_LOCATION } from "@bott/constants";

export default new GoogleGenAI({
  vertexai: true,
  project: GOOGLE_PROJECT_ID,
  location: GOOGLE_PROJECT_LOCATION,
});
