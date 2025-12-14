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
  BottEventType,
  type BottGlobalSettings,
  type BottUser,
} from "@bott/model";
import { BottEvent } from "@bott/service";

import gemini from "../client.ts";
import { ERROR_MODEL } from "@bott/constants";
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
      name: requestEvent.detail.name,
      options: requestEvent.detail.options,
      user_message_content: requestEvent.parent?.detail?.content,
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

  return new BottEvent(
    requestEvent.parent ? BottEventType.REPLY : BottEventType.MESSAGE,
    {
      detail: {
        content: interpretation ||
          "[SYSTEM] An error occurred while processing your request.",
      },
      user: context.user,
      channel: context.channel,
      parent: requestEvent.parent,
    },
  );
}
