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

import { APP_USER, GEMINI_EVENT_MODEL } from "@bott/constants";
import type { BottEvent } from "@bott/events";
import { cloneBottEvent } from "@bott/events";
import type {
  Content,
  GenerateContentConfig,
  Part,
  Schema,
} from "@google/genai";
import { encodeBase64 } from "@std/encoding/base64";
import ejs from "ejs";
import gemini from "../../../client.ts";
import type { EventPipelineContext } from "../pipeline/types.ts";

const eventStructure = (await Deno.readTextFile(
  new URL("./eventStructure.md.ejs", import.meta.url),
)).replaceAll("<!-- deno-fmt-ignore-file -->\n", "");

export interface QueryGeminiOptions {
  model?: string;
  pipeline: EventPipelineContext;
  responseSchema?: Schema;
  systemPrompt: string;
  useIdentity?: boolean;
}

export const queryGemini = async <O>(
  input: BottEvent[] | string,
  {
    systemPrompt,
    responseSchema,
    pipeline,
    model = GEMINI_EVENT_MODEL,
    useIdentity = true,
  }: QueryGeminiOptions,
): Promise<O> => {
  if (!model) {
    throw new Error(
      "queryGemini: No model provided. Ensure `GEMINI_EVENT_MODEL` is set in your environment.",
    );
  }

  let parts: Part[] = useIdentity
    ? [{ text: pipeline.action.service.app.identity }]
    : [];

  parts = [...parts, { text: systemPrompt }, {
    text: ejs.render(eventStructure, pipeline.action, {
      filename: new URL("./eventStructure.md.ejs", import.meta.url).pathname,
    }),
  }];

  const config: GenerateContentConfig = {
    abortSignal: pipeline.action.signal,
    candidateCount: 1,
    systemInstruction: {
      parts,
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
    contents: typeof input === "string" ? [input] : await Promise.all(
      input.map((event) => _transformBottEventToContent(event, pipeline)),
    ),
    config,
  });

  const result = response.candidates?.[0]?.content?.parts
    ?.filter((part: Part) => "text" in part && typeof part.text === "string")
    .map((part: Part) => (part as { text: string }).text)
    .join("") ?? "";

  // Despite the schema, Gemini may still return a code block.
  const cleanedResult = result.replace(/^```json\s*/i, "").replace(
    /^```\s*/,
    "",
  ).replace(/```\s*$/, "");

  try {
    return JSON.parse(cleanedResult) as O;
  } catch {
    return result as O;
  }
};

export const _transformBottEventToContent = async (
  event: BottEvent,
  context: EventPipelineContext,
): Promise<Content> => {
  if (!event.user) {
    throw new Error(
      "_transformBottEventToContent: Event must have a user",
    );
  }

  const {
    attachments: _attachments,
    parent: _parent,
    channel: _channel, // don't need this
    detail: _detail,
    createdAt,
    ...rest
  } = cloneBottEvent(event);

  let parent;

  if (_parent) {
    parent = {
      ..._parent,
      createdAt: _formatTimestampAsRelative(_parent.createdAt),
    };

    delete parent.parent;
    delete parent.attachments;
  }

  const metadata = context.evaluationState.get(event);

  // The system handles these, not Gemini
  delete _detail?.shouldInterpretOutput;
  delete _detail?.shouldForwardOutput;

  const eventToSerialize = {
    ...rest,
    createdAt: _formatTimestampAsRelative(createdAt),
    parent,
    detail: _detail,
    _pipelineEvaluationMetadata: {
      focusReasons: metadata?.focusReasons?.map(({ name, instruction }) => ({
        name,
        instruction,
      })),
      outputReasons: metadata?.outputReasons?.map(({ name }) => name),
      ratings: metadata?.ratings,
    },
  };

  const parts: Part[] = [{ text: JSON.stringify(eventToSerialize) }];

  // TODO: check all service users
  const isModel = event.user.id === APP_USER.id ||
    event.user.id === "service:action";

  const content: Content = {
    role: isModel ? "model" : "user",
    parts,
  };

  if (event.attachments && event.attachments.length) {
    parts.push({ text: "--- Attachments ---" });

    for (const attachment of event.attachments) {
      if (!attachment.compressed?.file) {
        continue;
      }

      parts.push({ text: `Attachment ID: ${attachment.id}` });

      parts.push({
        inlineData: {
          mimeType: attachment.compressed.file.type,
          data: encodeBase64(
            new Uint8Array(await attachment.compressed.file.arrayBuffer()),
          ),
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
  timestamp: Date | string | undefined,
): string | undefined => {
  if (!timestamp) {
    return undefined;
  }

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
