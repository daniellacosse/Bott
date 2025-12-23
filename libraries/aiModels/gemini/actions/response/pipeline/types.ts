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

import type { BottActionContext } from "@bott/actions";
import type { BottEvent } from "@bott/events";
import type { BottReason } from "@bott/model";

/**
 * Pipeline evaluation metadata stored separately from event details.
 * This data is ephemeral and not persisted to the database.
 */
export interface PipelineEvaluationMetadata {
  ratings?: Record<string, number>;
  focusReasons?: BottReason[];
  outputReasons?: BottReason[];
}

export interface EventPipelineContext {
  action: BottActionContext;
  data: {
    input: BottEvent[];
    output: BottEvent[];
  };
  /** Ephemeral evaluation state for events in the pipeline. */
  evaluationState: Map<BottEvent, PipelineEvaluationMetadata>;
}

export type EventPipelineProcessor = (
  this: EventPipelineContext,
) => Promise<void>;

export type EventPipeline = EventPipelineProcessor[];
