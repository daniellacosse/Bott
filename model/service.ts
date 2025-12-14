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

import { BottEvent, BottEventType, BottUser } from "./main.ts";

export type BottService = {
  user: BottUser;
};

export type BottServiceOptions<
  O extends Record<string, unknown> = Record<string, unknown>,
> = O & {
  deployNonce?: string;
  events?: {
    [key in BottEventType]?: (event: BottEvent) => void;
  };
};

export type BottServiceFactory<
  O extends Record<string, unknown> = Record<string, unknown>,
> = (
  options: BottServiceOptions<O>,
) => Promise<BottService>;
