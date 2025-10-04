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

import { Handlebars } from "https://deno.land/x/handlebars/mod.ts";

import type { BottEvent } from "@bott/model";

import { getEventSchema } from "../../utilities/getSchema.ts";
import { queryGemini } from "../../utilities/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";

import systemPromptTemplate from "./systemPrompt.md.hbs";

export const generateRawOutput: EventPipelineProcessor = async function (
  context,
) {
  const systemPrompt = await new Handlebars().renderView(
    systemPromptTemplate,
    { context },
  );

  context.data.output = await queryGemini<BottEvent[]>(
    context.data.input,
    systemPrompt,
    getEventSchema(context),
    context,
  );

  return context;
};
