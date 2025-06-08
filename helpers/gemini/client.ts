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

import { GoogleGenAI } from "npm:@google/genai";

export default new GoogleGenAI({
  vertexai: true,
  project: Deno.env.get("GOOGLE_PROJECT_ID"),
  location: Deno.env.get("GOOGLE_PROJECT_LOCATION"),
});
