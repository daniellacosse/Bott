import _gemini from "../client.ts";
import type { PromptParameters } from "../types.ts";
import { Buffer } from "node:buffer";

export async function generateText(prompt: string, {
  model = "gemini-2.5-pro-preview-05-06",
  gemini = _gemini,
}: PromptParameters = {}): Promise<Buffer> {
  const response = await gemini.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      candidateCount: 1,
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
        "Remove the citation numbers (e.g. [1, 2]) from this text.",
    },
  });

  if (!sanitizedResponse.text) {
    throw new Error("No text in sanitized response");
  }

  return Buffer.from(sanitizedResponse.text);
}
