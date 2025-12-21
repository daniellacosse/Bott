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
export const patchOutput: EventPipelineProcessor = async function () {
  if (!this.data.output.length) {
    return;
  }

  log.debug(`Patching ${this.data.output.length} events...`);

  this.data.output = await queryGemini<BottEvent[]>(
    this.data.output,
    {
      systemPrompt,
      responseSchema: getEventSchema(this.action.service.settings),
      pipeline: this,
      useIdentity: false,
    },
  );

  log.debug(
    `Patched events: ${this.data.output.length}. Content: ${JSON.stringify(
      this.data.output.map((e) => ({
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
  for (const event of this.data.output) {
    this.evaluationState.set(event, {
      outputReasons: this.action.service.settings.reasons.output,
    });
  }
};
