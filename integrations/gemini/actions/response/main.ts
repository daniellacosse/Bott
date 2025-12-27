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

import {
  ACTION_RESPONSE_NAME,
  ACTION_RESPONSE_OUTPUT_TIME_LIMIT_MS,
  ACTION_RESPONSE_OUTPUT_WORDS_PER_MINUTE,
  log,
} from "@bott/common";
import BottSystem, {
  type BottAction,
  type BottEventInterface as BottEvent,
} from "@bott/system";
import { delay } from "@std/async";
import pipelineProcess, { type EventPipelineContext } from "./pipeline/main.ts";

export const responseAction: BottAction = BottSystem.Actions.create({
  name: ACTION_RESPONSE_NAME,
  instructions: "Trigger a response for this channel.",
  shouldForwardOutput: true,
}, async function* () {
  if (!this.channel) {
    throw new Error("Channel not found");
  }

  const pipeline: EventPipelineContext = {
    data: {
      input: (await BottSystem.Events.Storage.getHistory(this.channel)).map((
        e,
      ) => e.toJSON()),
      output: [],
    },
    evaluationState: new Map(),
    action: this,
  };

  for (const step of pipelineProcess) {
    log.perf(step.name);
    await step.call(pipeline);
    log.perf(step.name);
  }

  // Update processed input events
  const processedInputEvents: Promise<BottEvent>[] = [];
  for (const inputEvent of pipeline.data.input) {
    if (!pipeline.evaluationState.has(inputEvent.id)) continue;

    processedInputEvents.push(BottSystem.Events.createFromShallow({
      ...inputEvent,
      lastProcessedAt: pipeline.evaluationState.get(inputEvent.id)
        ?.evaluationTime?.toISOString(),
    }));
  }

  await BottSystem.Events.Storage.upsert(
    ...await Promise.all(processedInputEvents),
  );

  for (const event of pipeline.data.output) {
    const metadata = pipeline.evaluationState.get(event.id);

    if (!metadata?.outputReasons?.length) {
      continue;
    }

    if (typeof event.detail?.content === "string") {
      await delay(getTypingTimeForString(event.detail.content), {
        signal: this.signal,
      });
    }

    yield await BottSystem.Events.createFromShallow(event);
  }
});

const MS_IN_MINUTE = 60 * 1000;

const getTypingTimeForString = (str: string) => {
  const words = str.split(/\s+/).length;
  const delayMs = (words / ACTION_RESPONSE_OUTPUT_WORDS_PER_MINUTE) *
    MS_IN_MINUTE;
  const cappedDelayMs = Math.min(
    delayMs,
    ACTION_RESPONSE_OUTPUT_TIME_LIMIT_MS,
  );

  return cappedDelayMs;
};
