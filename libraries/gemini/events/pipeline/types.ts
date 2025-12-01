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
  BottAction,
  BottChannel,
  BottEvent,
  BottGlobalSettings,
  BottUser,
} from "@bott/model";

export interface EventPipelineContext {
  data: {
    input: BottEvent[];
    output: BottEvent[];
  };
  abortSignal: AbortSignal;
  user: BottUser;
  channel: BottChannel;
  actions: Record<string, BottAction<AnyShape, AnyShape>>;
  settings: BottGlobalSettings;
}

export type EventPipelineProcessor = (
  context: EventPipelineContext,
) => Promise<EventPipelineContext>;

export type EventPipeline = EventPipelineProcessor[];
