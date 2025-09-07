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
  AnyShape,
  BottChannel,
  BottRequestHandler,
  BottTrait,
  BottUser,
} from "@bott/model";

export type GeminiEventGenerationContext<O extends AnyShape> = {
  identityPrompt: string;
  user: BottUser;
  channel: BottChannel;
  inputTraits: Record<string, BottTrait>;
  outputTraits: Record<string, BottTrait>;
  requestHandlers: Record<string, BottRequestHandler<O, AnyShape>>;
};
