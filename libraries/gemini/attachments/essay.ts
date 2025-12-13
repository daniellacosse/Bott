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

import _gemini from "../client.ts";
import type { BottAttachmentDataGenerator } from "./types.ts";
import { ESSAY_MODEL } from "../constants.ts";

import { BottAttachmentType } from "@bott/model";

export const generateEssayData: BottAttachmentDataGenerator = async (
  prompt: string,
  {
    model = ESSAY_MODEL,
    gemini = _gemini,
  },
) => {
  const response = await gemini.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      candidateCount: 1,
      systemInstruction:
        "Do NOT ask for additional information: fullfill the request as written to the best of your ability.",
    },
  });

  if (!response.text) {
    throw new Error("No text in initial response");
  }

  const sanitizedResponse = await gemini.models.generateContent({
    model,
    contents: response.text,
    config: {
      candidateCount: 1,
      systemInstruction:
        "Remove the citation numbers (e.g. [1, 2]) from this text. It is **crucial** you only output the sanitized text.",
    },
  });

  if (!sanitizedResponse.text) {
    throw new Error("No text in sanitized response");
  }

  return new File(
    [new TextEncoder().encode(sanitizedResponse.text)],
    "essay.txt",
    {
      type: BottAttachmentType.TXT,
    },
  );
};
