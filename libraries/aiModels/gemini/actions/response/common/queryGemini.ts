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

import { GEMINI_EVENT_MODEL } from "@bott/constants";
import type { BottEvent } from "@bott/events";
import type {
  Content,
  GenerateContentConfig,
  Part,
  Schema,
} from "@google/genai";
import { getPersona } from "@bott/storage";
import { encodeBase64 } from "@std/encoding/base64";
import ejs from "ejs";
import gemini from "../../../client.ts";
import type { EventPipelineContext } from "../pipeline/types.ts";

const eventStructure = await Deno.readTextFile(
  new URL("./eventStructure.md.ejs", import.meta.url),
);

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
    text: ejs.render(eventStructure, pipeline.action),
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

  let response;
  try {
    response = await gemini.models.generateContent({
      model,
      contents: typeof input === "string" ? [input] : await Promise.all(
        input.map((event) => _transformBottEventToContent(event, pipeline)),
      ),
      config,
    });
  } catch (error) {
    const geminiError = error as Error;

    // Gemini errors are often empty...
    geminiError.message ||=
      "queryGemini: Error generating content. Gemini provided no error message: you are likely unauthenticated.";

    throw geminiError;
  }

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

/**
 * Transforms persona mentions from @<personaId> to @handle format for better LLM processing.
 * Persona IDs are expected to be alphanumeric with hyphens and underscores.
 * @internal Exported for testing purposes only
 */
export const _transformMentionsToHandles = async (
  content: string,
  event: BottEvent,
): Promise<string> => {
  if (!event.channel?.space) {
    return content;
  }

  // Match @<personaId> patterns - restricting to alphanumeric, hyphens, and underscores
  const mentionPattern = /@<([a-zA-Z0-9_-]+)>/g;
  const matches = [...content.matchAll(mentionPattern)];

  let transformedContent = content;

  for (const match of matches) {
    const personaId = match[1];
    const persona = await getPersona(personaId, event.channel.space);

    if (persona) {
      // Replace all occurrences of @<personaId> with @handle
      const mentionToReplace = `@<${personaId}>`;
      transformedContent = transformedContent.replaceAll(
        mentionToReplace,
        `@${persona.handle}`,
      );
    }
  }

  return transformedContent;
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
  } = structuredClone(event);

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

  // Transform mentions from @<personaId> to @handle for better LLM processing
  if (_detail?.content && typeof _detail.content === "string") {
    _detail.content = await _transformMentionsToHandles(_detail.content, event);
  }

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
  const content: Content = {
    role: (event.user?.id === context.action.user?.id) ? "model" : "user",
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
