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

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

export const generateOutput: EventPipelineProcessor = async function (
  context,
) {
  // If there's nothing to focus on, skip this step.
  if (
    !context.data.input.some((event) =>
      context.evaluationState.get(event)?.shouldFocus
    )
  ) {
    return context;
  }

  context.data.output = await queryGemini<BottEvent[]>(
    context.data.input,
    {
      systemPrompt,
      responseSchema: getEventSchema(context),
      context,
      outputCriteria: "## Output Criteria\n\n" +
        "Your output will be evaluated based on the following criteria. Ensure your response meets these standards:\n\n" +
        context.settings.reasons.output.map((reason) =>
          `- **${reason.name}**: ${reason.definition}` +
          (reason.instruction ? `\n  Instruction: ${reason.instruction}` : "")
        ).join("\n"),
    },
  );

  for (const event of context.data.output) {
    context.evaluationState.set(event, { shouldOutput: true });
  }

  return context;
};
