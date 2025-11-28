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

import { BottGlobalSettings, BottUser } from "@bott/model";

import { getDefaultIdentity } from "./identity.ts";
import * as reasons from "./reasons.ts";

export const getDefaultGlobalSettings = (
  context: { user: BottUser },
): BottGlobalSettings => ({
  identity: getDefaultIdentity(context),
  reasons: {
    input: [
      reasons.whenAddressed(context.user),
      reasons.checkFacts,
      reasons.ensureImportance,
    ],
    output: [
      reasons.ensureImportance,
    ],
  },
});
