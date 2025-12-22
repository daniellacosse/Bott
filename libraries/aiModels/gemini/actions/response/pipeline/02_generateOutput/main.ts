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

import { log } from "@bott/log";
import ejs from "ejs";
import { getEventSchema } from "../../common/getSchema.ts";
import { queryGemini } from "../../common/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";
import { resolveOutputEvents } from "../../common/events.ts";

const systemPromptTemplate = await Deno.readTextFile(
  new URL("./systemPrompt.md.ejs", import.meta.url),
);

export const generateOutput: EventPipelineProcessor = async function () {
  // If there's nothing to focus on, skip this step.
  if (
    !this.data.input.some((event) =>
      this.evaluationState.get(event)?.focusReasons?.length
    )
  ) {
    return;
  }

  const systemPrompt = ejs.render(systemPromptTemplate, this);

  this.data.output = await queryGemini<BottEvent[]>(
    this.data.input,
    {
      systemPrompt,
      responseSchema: getEventSchema(this.action.service.settings),
      pipeline: this,
    },
  )

  this.data.output = await resolveOutputEvents(this);

  log.debug(this.data.output);
};
