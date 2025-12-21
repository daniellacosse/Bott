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

import { createAction } from "@bott/actions";
import type { BottAction, BottActionSettings } from "@bott/actions";
import { GEMINI_PHOTO_MODEL, RATE_LIMIT_PHOTOS } from "@bott/constants";
import { BottEventType } from "@bott/model";
import { BottServiceEvent } from "@bott/service";
import { prepareAttachmentFromFile } from "@bott/storage";
import {
  type GenerateContentParameters,
  HarmBlockThreshold,
  HarmCategory,
  type Part,
} from "@google/genai";

import { decodeBase64, encodeBase64 } from "@std/encoding/base64";

import _gemini from "../client.ts";

const settings: BottActionSettings = {
  name: "photo",
  instructions: "Generate a photo based on the prompt.",
  limitPerMonth: RATE_LIMIT_PHOTOS,
  shouldForwardOutput: true,
  parameters: [{
    name: "prompt",
    type: "string",
    description: "Description of the image to generate",
    required: true,
  }, {
    name: "media",
    type: "file",
    description: "Optional reference media for the image generation",
    required: false,
  }],
};

export const photoAction: BottAction = createAction(
  async function* ({ prompt, media }) {
    if (!GEMINI_PHOTO_MODEL) {
      throw new Error("Gemini photo model is not configured");
    }

    if (media && !((media as File)?.type.startsWith("image/"))) {
      throw new Error(
        `Unsupported media type: ${(media as File)?.type
        }. Only images are supported.`,
      );
    }

    const parts: Part[] = [{ text: prompt as string }];

    if (media) {
      parts.push({
        inlineData: {
          data: encodeBase64(await (media as File).arrayBuffer()),
          mimeType: (media as File).type,
        },
      });
    }

    const request: GenerateContentParameters = {
      model: GEMINI_PHOTO_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        abortSignal: this.signal,
        candidateCount: 1,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      },
    };

    const response = await _gemini.models.generateContent(request);

    if (!response.candidates?.length) {
      throw new Error("No candidates returned");
    }

    const candidate = response.candidates[0];
    if (
      candidate.finishReason !== "STOP" && candidate.finishReason !== undefined
    ) {
      throw new Error(`Generation stopped: ${candidate.finishReason}`);
    }

    let imageBytes: string | undefined;
    let _mimeType: string | undefined;

    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData) {
        imageBytes = part.inlineData.data;
        _mimeType = part.inlineData.mimeType;
        break;
      }
    }

    if (!imageBytes) {
      throw new Error("No image data found in response");
    }

    const file = new File(
      [decodeBase64(imageBytes)],
      "photo.png",
      { type: _mimeType ?? "image/png" },
    );

    // Create the event first
    const resultEvent = new BottServiceEvent(
      BottEventType.MESSAGE,
      {
        detail: {
          content: "Here is your photo:",
        },
        user: this.user, // Or system user? Usually actions output as the bot.
        channel: this.channel,
      },
    );

    const attachment = await prepareAttachmentFromFile(
      file,
      resultEvent,
    );

    resultEvent.attachments = [attachment];

    yield resultEvent;
  },
  settings,
);
