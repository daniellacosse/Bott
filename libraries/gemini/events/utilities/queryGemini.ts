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

import { encodeBase64 } from "@std/encoding/base64";
import ejs from "ejs";
import type {
  Content,
  GenerateContentConfig,
  Part,
  Schema,
} from "@google/genai";
import type { BottEvent } from "@bott/model";

import type { EventPipelineContext } from "../pipeline/types.ts";
import gemini from "../../client.ts";
import { EVENT_MODEL } from "../../constants.ts";

const eventStructure = await Deno.readTextFile(
  new URL("./eventStructure.md.ejs", import.meta.url),
);

export interface QueryGeminiOptions {
  systemPrompt: string;
  responseSchema?: Schema;
  context: EventPipelineContext;
  model?: string;
  useIdentity?: boolean;
}

export const queryGemini = async <O>(
  input: BottEvent[] | string,
  {
    systemPrompt,
    responseSchema,
    context,
    model = EVENT_MODEL,
    useIdentity = true,
  }: QueryGeminiOptions,
): Promise<O> => {
  const config: GenerateContentConfig = {
    abortSignal: context.abortSignal,
    candidateCount: 1,
    systemInstruction: {
      parts: [
        ...(useIdentity ? [{ text: context.settings.identity }] : []),
        {
          text: systemPrompt,
        },
        {
          text: ejs.render(eventStructure, context),
        },
      ],
    },
    tools: [
      { googleSearch: {} },
    ],
  };

  if (responseSchema) {
    config.responseSchema = responseSchema;
    config.responseMimeType = "application/json";
  }

  const response = await gemini.models.generateContent({
    model,
    contents: typeof input === "string"
      ? [input]
      : input.map((event) => _transformBottEventToContent(event, context)),
    config,
  });

  const result = response.candidates?.[0]?.content?.parts
    ?.filter((part: Part) => "text" in part && typeof part.text === "string")
    .map((part: Part) => (part as { text: string }).text)
    .join("") ?? "";

  try {
    return JSON.parse(result) as O;
  } catch {
    return result as O;
  }
};

export const _transformBottEventToContent = (
  event: BottEvent,
  context: EventPipelineContext,
): Content => {
  const { files: _files, parent, createdAt, ...rest } = event;

  const pTimestamp = parent && "createdAt" in parent
    ? parent.createdAt
    : undefined;
  const parentContent = parent
    ? {
      ...parent,
      createdAt: pTimestamp,
    }
    : undefined;

  const evaluationMetadata = context.evaluationState.get(event);
  const triggeredInstructions = evaluationMetadata?.triggeredReasons?.map(
    (reasonName) => {
      const reason = [
        ...context.settings.reasons.input,
        ...context.settings.reasons.output,
      ].find((r) => r.name === reasonName);
      return reason?.instruction;
    },
  ).filter(Boolean) as string[] | undefined;

  const eventToSerialize = {
    ...structuredClone(rest),
    createdAt: _formatTimestampAsRelative(
      createdAt ? createdAt : new Date(),
    ),
    parent: parentContent,
    // Inject ephemeral state
    ratings: evaluationMetadata?.ratings,
    shouldFocus: evaluationMetadata?.shouldFocus,
    shouldOutput: evaluationMetadata?.shouldOutput,
    instructions: triggeredInstructions && triggeredInstructions.length > 0
      ? triggeredInstructions
      : undefined,
  };

  const parts: Part[] = [{ text: JSON.stringify(eventToSerialize) }];
  const content: Content = {
    role: (event.user && event.user.id === context.user.id) ? "model" : "user",
    parts,
  };

  if (event.files && event.files.length) {
    parts.push({ text: "--- Attached Files ---" });

    for (const file of event.files) {
      if (!file.compressed) {
        continue;
      }

      parts.push({
        inlineData: {
          mimeType: file.compressed.type,
          data: encodeBase64(file.compressed.data!),
        },
      });
    }
  }

  return content;
};

/**
 * Formats an ISO timestamp as a human-readable relative time string.
 * Examples: "just now", "2 minutes ago", "3 hours ago", "5 days ago"
 * @internal Exported for testing purposes only
 */
export const _formatTimestampAsRelative = (
  timestamp: Date | string,
): string => {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  } else {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }
};
