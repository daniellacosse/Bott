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

import type { EventPipelineContext } from "../pipeline/types.ts";

import gemini from "../../client.ts";
import { EVENT_MODEL } from "../../constants.ts";
import type { GenerateContentConfig, Schema } from "@google/genai";
import type { BottEvent } from "@bott/model";

import type { Content, Part } from "@google/genai";
import type { AnyShape } from "@bott/model";

export const queryGemini = async <O>(
  events: BottEvent<AnyShape>[],
  systemPrompt: string,
  responseSchema: Schema | null,
  context: EventPipelineContext,
  model = EVENT_MODEL,
): Promise<O> => {
  const config: GenerateContentConfig = {
    abortSignal: context.abortSignal,
    candidateCount: 1,
    systemInstruction: {
      parts: [
        { text: context.settings.identity },
        {
          text: systemPrompt,
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

    // Can't use tools and structured response in the same request.
    delete config.tools;
  }

  const response = await gemini.models.generateContent({
    model,
    contents: events.map((event) =>
      _transformBottEventToContent(event, context.user.id)
    ),
    config,
  });

  return JSON.parse(
    response.candidates?.[0]?.content?.parts
      ?.filter((part: Part) => "text" in part && typeof part.text === "string")
      .map((part: Part) => (part as { text: string }).text)
      .join("") ?? "",
  );
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

export const _transformBottEventToContent = (
  event: BottEvent<AnyShape>,
  modelUserId: string,
): Content => {
  // Explicitly construct the object to be stringified to avoid circular references,
  // (Especially from event.files[...].parent pointing back to the event itself.)
  const eventToSerialize: Record<string, unknown> = {
    id: event.id,
    type: event.type,
    details: event.details, // Assuming details are already JSON-serializable
    timestamp: _formatTimestampAsRelative(event.timestamp),
    user: event.user ? { id: event.user.id, name: event.user.name } : undefined,
    channel: event.channel
      ? {
        id: event.channel.id,
        name: event.channel.name,
        description: event.channel.description,
        space: event.channel.space
          ? {
            id: event.channel.space.id,
            name: event.channel.space.name,
            description: event.channel.space.description,
          }
          : undefined,
      }
      : undefined,
  };

  if (event.parent) {
    // The caller (generateEvents) should have already handled event.parent.files.
    // We create a simplified parent reference here.
    const { files: _files, ...parentDetails } = event.parent;

    if (parentDetails.parent) {
      // This level of nesting in this context is unnecessary.
      delete parentDetails.parent;
    }

    // Create an intermediary object with formatted timestamp
    eventToSerialize.parent = {
      ...parentDetails,
      timestamp: _formatTimestampAsRelative(parentDetails.timestamp),
    };
  }

  const parts: Part[] = [{ text: JSON.stringify(eventToSerialize) }];
  const content: Content = {
    role: (event.user && event.user.id === modelUserId) ? "model" : "user",
    parts,
  };

  if (event.files) {
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
