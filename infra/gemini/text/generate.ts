import _gemini from "../client.ts";
import type { PromptParameters } from "../types.ts";

export async function generateText(prompt: string, {
  context = [],
  instructions,
  model = "gemini-2.5-flash-preview-04-17",
  gemini = _gemini,
}: PromptParameters = {}): Promise<string> {
  const response = await gemini.models.generateContent({
    model,
    contents: [
      ...context.map((text) => ({
        role: "user",
        parts: [{ text }],
      })),
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      candidateCount: 1,
      systemInstruction: instructions
        ? {
          role: "system",
          text: instructions,
        }
        : undefined,
    },
  });

  if (!response.text) {
    throw new Error("No text in response");
  }

  return response.text;
}
