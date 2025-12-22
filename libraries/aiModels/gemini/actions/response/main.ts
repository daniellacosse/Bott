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
  ACTION_RESPONSE_OUTPUT_TIME_LIMIT_MS as TYPING_MAX_TIME_MS,
  ACTION_RESPONSE_OUTPUT_WORDS_PER_MINUTE as TYPING_WORDS_PER_MINUTE,
} from "@bott/constants";
import { log } from "@bott/log";
import { addEvents, getEventHistory } from "@bott/storage";

import { delay } from "@std/async";

import { prepareInputEvents, resolveOutputEvents } from "./common/events.ts";
import pipelineProcess, { type EventPipelineContext } from "./pipeline/main.ts";

const MS_IN_MINUTE = 60 * 1000;

const settings: BottActionSettings = {
  name: "response",
  instructions: "Simulate a response for a channel.",
  shouldForwardOutput: true,
};

export const responseAction: BottAction = createAction(
  async function* () {
    const channelHistory = await getEventHistory(this.channel!);
    const preparedInput = prepareInputEvents(channelHistory);

    const pipeline: EventPipelineContext = {
      data: {
        input: preparedInput,
        output: [],
      },
      evaluationState: new Map(),
      action: this,
    };

    for (const step of pipelineProcess) {
      try {
        log.perf(step.name);
        await step.call(pipeline);
        log.perf(step.name);
      } catch (error) {
        log.error(error);
        break;
      }
    }

    // Input events were processed, update their lastProcessedAt
    // TODO: lastProcessedAt should be assigned in the pipeline
    try {
      const processingTime = new Date();

      await addEvents(
        ...pipeline.data.input.map((event) => {
          event.lastProcessedAt = processingTime;
          return event;
        }),
      );
    } catch (error) {
      log.warn(error);
    }

    for (const event of await resolveOutputEvents(pipeline)) {
      if (!pipeline.evaluationState.get(event)?.outputReasons?.length) {
        continue;
      }

      const content = typeof event.detail?.content === "string"
        ? event.detail.content
        : "";
      const words = content.split(/\s+/).length;
      const delayMs = (words / TYPING_WORDS_PER_MINUTE) * MS_IN_MINUTE;
      const cappedDelayMs = Math.min(
        delayMs,
        TYPING_MAX_TIME_MS,
      );

      await delay(cappedDelayMs, { signal: this.signal });

      yield event;
    }
  },
  settings,
);
