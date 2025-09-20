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
import * as _classifiers from "./classifiers.ts";
import * as rules from "./rules.ts";

const { directedAt, ...classifiers } = _classifiers;

export const getDefaultGlobalSettings = (
  context: { user: BottUser },
): BottGlobalSettings => ({
  identity: getDefaultIdentity(context),
  classifiers: new Set([
    directedAt(context.user),
    ...Object.values(classifiers),
  ]),
  rules: new Set(Object.values(rules)),
});
