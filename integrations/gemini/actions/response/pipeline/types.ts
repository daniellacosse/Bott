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

import type { BottReason } from "@bott/model";
import type { BottActionContext } from "@bott/system";
import type { ShallowBottEvent } from "@bott/system";

/**
 * Pipeline evaluation metadata stored separately from event details.
 * This data is ephemeral and not persisted to the database.
 */
export interface PipelineEvaluationMetadata {
  evaluationTime?: Date;
  ratings?: Record<string, number>;
  focusReasons?: BottReason[];
  outputReasons?: BottReason[];
}

export interface EventPipelineContext {
  action: BottActionContext;
  data: {
    input: ShallowBottEvent[];
    output: ShallowBottEvent[];
  };
  /** Ephemeral evaluation state for events in the pipeline. */
  evaluationState: Map<string, PipelineEvaluationMetadata>;
}

export type EventPipelineProcessor = (
  this: EventPipelineContext,
) => Promise<void>;

export type EventPipeline = EventPipelineProcessor[];
