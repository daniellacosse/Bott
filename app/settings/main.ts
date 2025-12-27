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

import { APP_NAME } from "@bott/common";
import type { BottSettings } from "@bott/model";

import ejs from "ejs";

import * as reasons from "./reasons.ts";

const identityTemplate = Deno.readTextFileSync(
  new URL("./identity.md.ejs", import.meta.url),
);

export const settings: BottSettings = {
  identity: ejs.render(identityTemplate, { name: APP_NAME }),
  reasons: {
    input: [
      reasons.whenAddressed,
      reasons.checkFacts,
    ],
    output: [
      reasons.answerRequest,
      reasons.ensurePotentialImpact,
    ],
  },
};
