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

import ejs from "ejs";
import { BottGlobalSettings } from "@bott/model";

import { BOTT_NAME } from "@bott/constants";

import * as reasons from "./reasons.ts";

const identityTemplate = Deno.readTextFileSync(
  new URL("./identity.md.ejs", import.meta.url),
);

export const defaultSettings: BottGlobalSettings = {
  identity: ejs.render(identityTemplate, { name: BOTT_NAME }),
  reasons: {
    input: [
      reasons.whenAddressed,
      reasons.checkFacts,
    ],
    output: [
      reasons.ensurePotentialImpact,
    ],
  },
};
