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

import { join } from "@std/path";

import ejs from "ejs";
import { resolveOutputEvents } from "../../common/events.ts";
import { getEventSchema } from "../../common/getSchema.ts";
import { queryGemini } from "../../common/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";

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

  const systemPrompt = ejs.render(systemPromptTemplate, this, {
    filename: join(import.meta.url, "./systemPrompt.md.ejs"),
  });

  this.data.output = await queryGemini<BottEvent[]>(
    this.data.input,
    {
      systemPrompt,
      responseSchema: getEventSchema(this.action.service.settings),
      pipeline: this,
    },
  );

  this.data.output = await resolveOutputEvents(this);

  console.debug(this.data.output);
};
