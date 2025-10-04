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

import type { BottEvent } from "@bott/model";

import { getEventSchema } from "../../utilities/getSchema.ts";
import { queryGemini } from "../../utilities/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";

import systemPrompt from "./systemPrompt.md";

export const segmentRawOutput: EventPipelineProcessor = async (context) => {
  context.data.output = await queryGemini<BottEvent[]>(
    context.data.output,
    systemPrompt,
    getEventSchema(context),
    context,
  );

  return context;
};
