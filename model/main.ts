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

import { BottAttachmentType } from "./types/events.ts";

export * from "./service.ts";
export * from "./types/actions.ts";
export * from "./types/entities.ts";
// export * from "./types/events.ts"; // Handled by events.ts
export * from "./types/reasons.ts";
export * from "./types/settings.ts";
export * from "./types/utility.ts";

export type {
  BottActionCallEvent,
  BottActionResultEvent,
  BottEventAttachment,
} from "./types/events.ts";
export { BottAttachmentType, BottEventType } from "./types/events.ts";
export * from "./events.ts";

export * from "./types/reasons.ts";
export * from "./types/settings.ts";
export * from "./types/utility.ts";

/**
 * Convenience map for looking up an extension based on its file type.
 */
export const BOTT_ATTACHMENT_TYPE_LOOKUP: Record<string, string> = Object
  .fromEntries(
    Object.entries(BottAttachmentType).map(([key, value]) => [value, key]),
  );
