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

import type { BottEvent } from "@bott/events";
import { resolveOutputEvents } from "../../common/events.ts";
import { getEventSchema } from "../../common/getSchema.ts";
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
  const segmentPromises: Promise<BottEvent[]>[] = [];

  let pointer = 0;
  while (pointer < output.length) {
    const event = output[pointer];

    // We only want to segment message/reply events.
    if (event.type !== "message" && event.type !== "reply") {
      segmentPromises.push(Promise.resolve([event]));
      pointer++;
      continue;
    }

    // TODO: allow to be set as "user" event dynamically
    // Pass as JSON string to treat as data/user input, avoiding "continuation" bias.
    segmentPromises.push(queryGemini<BottEvent[]>(
      JSON.stringify([event]),
      {
        systemPrompt,
        responseSchema: getEventSchema(this.action.service.settings),
        pipeline: this,
        useIdentity: false,
      },
    ));

    pointer++;
  }

  const segments = await Promise.all(segmentPromises);

  this.data.output = segments.flat();
  this.data.output = await resolveOutputEvents(this);

  console.debug(this.data.output);
};
