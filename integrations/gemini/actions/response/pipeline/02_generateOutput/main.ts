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

import { log } from "@bott/common";

import { join } from "@std/path";
import ejs from "ejs";
import {
  generateFromEvents,
  getEventSkeletonSchema,
  skeletonToShallowEvent,
} from "../../../../generate/module.ts";
import type { EventPipelineProcessor } from "../types.ts";

const systemPromptTemplate = await Deno.readTextFile(
  new URL("./systemPrompt.md.ejs", import.meta.url),
);

export const generateOutput: EventPipelineProcessor = async function () {
  // If there's nothing to focus on, skip this step.
  if (
    !this.data.input.some((event) =>
      this.evaluationState.get(event.id)?.focusReasons?.length
    )
  ) {
    return;
  }

  const systemPrompt = ejs.render(systemPromptTemplate, this, {
    filename: join(import.meta.url, "./systemPrompt.md.ejs"),
  });

  const generatedEventSkeletons = await generateFromEvents(
    this.data.input,
    {
      systemPrompt,
      responseSchema: getEventSkeletonSchema(this.action.service.actions),
      pipeline: this,
    },
  );

  this.data.output = generatedEventSkeletons.map((skeleton) =>
    skeletonToShallowEvent(skeleton, this)
  );

  log.debug(this.data.output);
};
