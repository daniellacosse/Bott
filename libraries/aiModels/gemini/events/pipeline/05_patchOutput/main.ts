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

import { log } from "@bott/log";
import type { BottEvent } from "@bott/model";
import { getEventSchema } from "../../common/getSchema.ts";
import { queryGemini } from "../../common/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

// TODO: how to handle metadata in this case?
export const patchOutput: EventPipelineProcessor = async (context) => {
  if (!context.data.output.length) {
    return context;
  }

  log.debug(`Patching ${context.data.output.length} events...`);

  context.data.output = await queryGemini<BottEvent[]>(
    context.data.output,
    {
      systemPrompt,
      responseSchema: getEventSchema(context),
      context,
      useIdentity: false,
    },
  );

  log.debug(
    `Patched events: ${context.data.output.length}. Content: ${JSON.stringify(
      context.data.output.map((e) => ({
        type: e.type,
        content: e.detail?.content ?? "n/a",
      })),
    )
    }`,
  );

  // Trusted Patching:
  // Since this step is explicitly designed to fix issues, we treat its output as "trusted".
  // We automatically inject all active output reasons as "passed" for these events,
  // bypassing the need for a re-evaluation loop.
  for (const event of context.data.output) {
    context.evaluationState.set(event, {
      outputReasons: context.settings.reasons.output,
    });
  }

  return context;
};
