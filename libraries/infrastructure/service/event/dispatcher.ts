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

import type { AnyShape, BottChannel, BottEventType, BottUser } from "@bott/model";
import { BottEvent } from "@bott/service";

export const dispatchEvent = (
  type: BottEventType,
  detail: AnyShape | undefined,
  context?: { user?: BottUser; channel?: BottChannel },
) => {
  globalThis.dispatchEvent(
    new BottEvent(type, {
      detail,
      user: context?.user,
      channel: context?.channel,
    }),
  );
};
