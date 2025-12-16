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
import { GCP_PROJECT_ID, GCP_REGION } from "@bott/constants";

export default new GoogleGenAI({
  vertexai: true,
  project: GCP_PROJECT_ID,
  location: GCP_REGION,
});
