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

import type { BottAction } from "@bott/actions";
import type { BottEvent } from "@bott/events";
import type { BottResponseSettings } from "@bott/model";

export type BottService = BottServiceFunction & BottServiceSettings;

export interface BottServiceFunction {
  (this: BottServiceContext): void | Promise<void>;
}

export interface BottServiceSettings {
  name: string;
  actions?: Record<string, BottAction>;
}

export interface BottServiceContext {
  nonce: string;
  settings: Required<BottServiceSettings>;
  app: BottResponseSettings;
  dispatchEvent: (event: BottEvent) => void;
  addEventListener<E extends BottEvent>(
    type: E["type"],
    listener: (event: E, context?: BottServiceContext) => unknown,
  ): void;
  removeEventListener<E extends BottEvent>(
    type: E["type"],
    listener: (event: E, context?: BottServiceContext) => unknown,
  ): void;
}
