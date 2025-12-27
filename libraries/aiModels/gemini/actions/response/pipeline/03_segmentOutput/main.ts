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

import type { ShallowBottEvent } from "@bott/events";
import { BottEventType } from "@bott/events";
import { log } from "@bott/log";
import {
  getEventSkeletonSchema,
  skeletonToShallowEvent,
} from "../../common/getSchema.ts";
import type { GeminiBottEventSkeleton } from "../../common/getSchema.ts";
import { queryGemini } from "../../common/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

export const segmentOutput: EventPipelineProcessor = async function () {
  if (!this.data.output.length) {
    return;
  }

  const output = this.data.output;
  const segmentPromises: Promise<ShallowBottEvent[]>[] = [];

  let pointer = 0;
  while (pointer < output.length) {
    const event = output[pointer];

    // We only want to segment message/reply events.
    if (
      event.type !== BottEventType.MESSAGE && event.type !== BottEventType.REPLY
    ) {
      segmentPromises.push(Promise.resolve([event]));
      pointer++;
      continue;
    }

    segmentPromises.push(
      new Promise((resolve) => {
        queryGemini<GeminiBottEventSkeleton[]>(
          [event],
          {
            systemPrompt,
            responseSchema: getEventSkeletonSchema(
              this.action.service.settings,
            ),
            pipeline: this,
            useThirdPersonAnalysis: true,
          },
        ).then((skeletons) =>
          resolve(
            skeletons.map((skeleton) => skeletonToShallowEvent(skeleton, this)),
          )
        );
      }),
    );

    pointer++;
  }

  const segments = await Promise.all(segmentPromises);

  this.data.output = segments.flat();

  log.debug(this.data.output);
};
