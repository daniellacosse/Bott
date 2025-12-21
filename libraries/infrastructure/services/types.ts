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

import type { BottAction, BottActionEventType } from "@bott/actions";
import type {
  BottEvent,
  BottEventType,
  BottResponseSettings,
} from "@bott/model";

export type BottService = BottServiceFunction & BottServiceSettings;

export interface BottServiceFunction {
  (this: BottServiceContext): void | Promise<void>;
}

export interface BottServiceSettings {
  name: string;
  actions?: Record<string, BottAction>;
  events?: Set<BottEventType | BottActionEventType>;
}

export interface BottServiceContext {
  nonce: string;
  settings: Required<BottServiceSettings>;
  app: BottResponseSettings;
  dispatchEvent: (event: BottEvent) => void;
  addEventListener: (
    type: BottEventType | BottActionEventType,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions,
  ) => void;
}
