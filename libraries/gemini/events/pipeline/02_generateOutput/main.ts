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

import Handlebars from "handlebars";

import { type BottEvent, BottEventType } from "@bott/model";

import { getEventSchema } from "../../utilities/getSchema.ts";
import { queryGemini } from "../../utilities/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";

import rawSystemPrompt from "./systemPrompt_raw.md" with { type: "text" };
import segmentingSystemPromptTemplate from "./systemPrompt_segment.md.hbs" with {
  type: "text",
};

export const generateOutput: EventPipelineProcessor = async function (
  context,
) {
  // If there's nothing to focus on, skip this step.
  if (!context.data.input.some((event) => event.details.focus)) {
    return context;
  }

  const rawOutput = await queryGemini<string>(
    context.data.input,
    rawSystemPrompt,
    null,
    context,
  );

  const segmentingSystemPrompt = Handlebars.compile(
    segmentingSystemPromptTemplate,
  )({ context });

  context.data.output = await queryGemini<BottEvent[]>(
    [{
      id: "FAKE",
      type: BottEventType.MESSAGE,
      timestamp: new Date(),
      details: {
        content: rawOutput,
      },
    }],
    segmentingSystemPrompt,
    getEventSchema(context),
    context,
  );

  return context;
};
