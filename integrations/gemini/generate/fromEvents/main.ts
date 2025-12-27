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

import {
  GEMINI_EVENT_MODEL,
} from "@bott/common";
import type { ShallowBottEvent } from "@bott/system";
import type {
  Part,
  Schema,
} from "@google/genai";
import ejs from "ejs";
import type { EventPipelineContext } from "../../actions/response/pipeline/types.ts";
import gemini from "../client.ts";
import { parseResult } from "./parse.ts";
import { prepareContents } from "./prepare.ts";
import type { GeminiEventSkeleton } from "./types.ts";

const eventStructureLocation = new URL(
  "./eventStructure.md.ejs",
  import.meta.url,
);
const eventStructureContents = await Deno.readTextFile(eventStructureLocation);

export interface GenerateFromEventsOptions {
  model?: string;
  pipeline: EventPipelineContext;
  responseSchema: Schema;
  systemPrompt: string;
  useThirdPersonAnalysis?: boolean;
}

export const generateFromEvents = async <O = GeminiEventSkeleton[]>(
  input: ShallowBottEvent[],
  {
    systemPrompt,
    responseSchema,
    pipeline,
    model = GEMINI_EVENT_MODEL,
    useThirdPersonAnalysis,
  }: GenerateFromEventsOptions,
): Promise<O> => {
  if (!model) {
    throw new Error(
      "No model provided. Ensure `GEMINI_EVENT_MODEL` is set in your environment.",
    );
  }

  const systemInstruction: { parts: Part[] } = {
    parts: [],
  };

  if (!useThirdPersonAnalysis) {
    systemInstruction.parts.push({
      text: pipeline.action.service.settings.identity,
    });
  }

  systemInstruction.parts.push(
    { text: systemPrompt },
    {
      text: ejs.render(eventStructureContents, pipeline.action, {
        filename: eventStructureLocation.pathname,
      }),
    },
  );

  const contents = await prepareContents(
    input,
    pipeline,
    useThirdPersonAnalysis,
  );

  const result = await gemini.models.generateContent({
    model,
    contents,
    config: {
      abortSignal: pipeline.action.signal,
      candidateCount: 1,
      systemInstruction,
      responseSchema,
      responseMimeType: "application/json",
      // TODO: Google Search
    },
  });

  return parseResult<O>(result);
};
