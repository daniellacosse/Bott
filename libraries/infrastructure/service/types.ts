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

import type { AnyShape, BottGlobalSettings, BottUser } from "@bott/model";

export type BottService = {
  user: BottUser;
  events?: string[];
};

export type BottServiceFactory<T = AnyShape> = (
  options: T,
) => Promise<BottService>;

export interface BottServiceContext {
  settings: BottGlobalSettings;
}
