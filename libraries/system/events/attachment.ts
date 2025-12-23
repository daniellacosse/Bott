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

import { BottAttachmentType } from "@bott/events";

/**
 * Convenience map for looking up an extension based on its file type.
 */
export const BOTT_ATTACHMENT_TYPE_LOOKUP: Record<string, string> = Object
  .fromEntries(
    Object.entries(BottAttachmentType).map(([key, value]) => [value, key]),
  );
