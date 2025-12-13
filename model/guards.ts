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

import type {
  BottActionCallEvent,
  BottActionResultEvent,
  BottEvent,
} from "./types/events.ts";
import { BottEventType } from "./types/events.ts";

export function isBottActionCallEvent(
  event: BottEvent,
): event is BottActionCallEvent {
  return event.type === BottEventType.ACTION_CALL;
}

export function isBottActionResultEvent(
  event: BottEvent,
): event is BottActionResultEvent {
  return event.type === BottEventType.ACTION_RESULT;
}
