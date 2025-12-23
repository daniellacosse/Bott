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

import { createAction } from "@bott/actions";
import type { BottAction, BottActionSettings } from "@bott/actions";
import {
  ACTION_RESPONSE_OUTPUT_TIME_LIMIT_MS,
  ACTION_RESPONSE_OUTPUT_WORDS_PER_MINUTE,
} from "@bott/constants";
import { log } from "@bott/log";
import { getEventHistory, upsertEvents } from "@bott/storage";

import { delay } from "@std/async";

import { prepareInputEvents } from "./common/events.ts";
import pipelineProcess, { type EventPipelineContext } from "./pipeline/main.ts";

const settings: BottActionSettings = {
  name: "response",
  instructions: "Simulate a response for a channel.",
  shouldForwardOutput: true,
};

export const responseAction: BottAction = createAction(
  async function* () {
    const channelHistory = await getEventHistory(this.channel!);

    const pipeline: EventPipelineContext = {
      data: {
        input: prepareInputEvents(channelHistory),
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
    await upsertEvents(...pipeline.data.input);

    for (const event of pipeline.data.output) {
      if (!pipeline.evaluationState.get(event)?.outputReasons?.length) {
        continue;
      }

      if (typeof event.detail?.content === "string") {
        await delay(getTypingTimeForString(event.detail.content), {
          signal: this.signal,
        });
      }

      yield event;
    }
  },
  settings,
);

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
