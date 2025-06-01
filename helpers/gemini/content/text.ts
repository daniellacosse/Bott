import _gemini from "../client.ts";
import type { ContentGenerator } from "./types.ts";

export const generateTextContents: ContentGenerator = async (prompt: string, {
  model = "gemini-2.5-pro-preview-05-06",
  gemini = _gemini,
} = {}) => {
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

  return new TextEncoder().encode(sanitizedResponse.text);
};
