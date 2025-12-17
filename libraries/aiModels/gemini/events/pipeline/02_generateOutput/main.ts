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

import ejs from "ejs";
import { log } from "@bott/log";
import { getEventSchema } from "../../common/getSchema.ts";
import { queryGemini } from "../../common/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";

const systemPromptTemplate = await Deno.readTextFile(
  new URL("./systemPrompt.md.ejs", import.meta.url),
);

export const generateOutput: EventPipelineProcessor = async function (
  context,
) {
  // If there's nothing to focus on, skip this step.
  if (
    !context.data.input.some((event) =>
      context.evaluationState.get(event)?.focusReasons?.length
    )
  ) {
    return context;
  }

  const systemPrompt = ejs.render(systemPromptTemplate, context);

  context.data.output = await queryGemini<BottEvent[]>(
    context.data.input,
    {
      systemPrompt,
      responseSchema: getEventSchema(context),
      context,
    },
  );

  log.debug(
    `Raw generated output: ${
      JSON.stringify(context.data.output, (key, value) => {
        if (key === "parent") return value?.id;
        return value;
      })
    }`,
  );

  return context;
};
