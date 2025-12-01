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
  type AnyShape,
  type BottActionCallEvent,
  type BottChannel,
  type BottEvent,
  BottEventType,
  type BottGlobalSettings,
  type BottUser,
} from "@bott/model";

import gemini from "../client.ts";
import { ERROR_MODEL } from "../constants.ts";
import instructions from "./instructions.ts";

export async function generateErrorMessage<O extends AnyShape>(
  // deno-lint-ignore no-explicit-any
  error: any,
  requestEvent: BottActionCallEvent<O>,
  context: {
    user: BottUser;
    channel: BottChannel;
    settings: BottGlobalSettings;
  },
): Promise<BottEvent> {
  const model = ERROR_MODEL;

  const geminiInput = {
    request: {
      name: requestEvent.details.name,
      options: requestEvent.details.options,
      user_message_content: requestEvent.parent?.details?.content,
    },
    error: {
      message: error.message,
      code: error.code,
      details: error.rawError || error.details,
    },
  };

  const result = await gemini.models.generateContent({
    model,
    contents: [{
      role: "user",
      parts: [{ text: JSON.stringify(geminiInput) }],
    }],
    config: {
      candidateCount: 1,
      systemInstruction: {
        parts: [{ text: context.settings.identity }, { text: instructions }],
      },
    },
  });

  const interpretation = result.candidates?.[0]?.content?.parts?.[0]?.text;

  return {
    id: crypto.randomUUID(),
    type: requestEvent.parent ? BottEventType.REPLY : BottEventType.MESSAGE,
    details: {
      content: interpretation ||
        "[SYSTEM] An error occurred while processing your request.",
    },
    timestamp: new Date(),
    user: context.user,
    channel: context.channel,
    parent: requestEvent.parent,
  };
}
