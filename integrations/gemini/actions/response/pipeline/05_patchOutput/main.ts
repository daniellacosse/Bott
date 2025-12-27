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
import { BottEventType } from "@bott/system";
import { Type } from "@google/genai";
import {
  type GeminiEventSkeleton,
  generateFromEvents,
  getEventSkeletonSchema,
  skeletonToShallowEvent,
} from "../../../../generate/module.ts";
import type { EventPipelineProcessor } from "../types.ts";

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

const patchOutputReason = {
  name: "patchOutput",
  description: "This event was patched by the patchOutput step.",
  validator: () => true,
};

type GeminiBottEventPatchSkeleton = GeminiEventSkeleton & {
  id: string;
};

export const patchOutput: EventPipelineProcessor = async function () {
  if (!this.data.output.length) {
    return;
  }

  const sequenceToPatch = [];
  const unsequencedOutputs = [];

  for (const event of this.data.output) {
    if (
      event.type === BottEventType.REACTION ||
      event.type === BottEventType.ACTION_CALL
    ) {
      unsequencedOutputs.push(event);
      continue;
    }

    sequenceToPatch.push(event);
  }

  if (!sequenceToPatch.length) {
    return;
  }

  const responseSchema = getEventSkeletonSchema(
    this.action.service.actions,
  );

  responseSchema.items!.anyOf = responseSchema.items!.anyOf!.map((schema) => {
    schema.properties!.id = {
      type: Type.STRING,
      description: "The ID of the event.",
    };
    schema.required!.push("id");
    return schema;
  });

  const patchedSequence = await generateFromEvents<
    GeminiBottEventPatchSkeleton[]
  >(
    sequenceToPatch,
    {
      systemPrompt,
      responseSchema,
      pipeline: this,
      useThirdPersonAnalysis: true,
    },
  );

  // Trusted Patching:
  // Since this step is explicitly designed to fix issues, we treat its output as "trusted".
  // We automatically inject all active output reasons as "passed" for these events,
  // bypassing the need for a re-evaluation loop.
  for (const event of patchedSequence) {
    this.evaluationState.set(event.id, {
      outputReasons: [patchOutputReason],
    });
  }

  this.data.output = [
    ...patchedSequence.map((event) => {
      const shallowEvent = skeletonToShallowEvent(event, this);
      shallowEvent.id = event.id;
      return shallowEvent;
    }),
    ...unsequencedOutputs,
  ];

  log.debug(this.data.output);
};
