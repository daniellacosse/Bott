import _gemini from "../client.ts";
import type { PromptParameters } from "../types.ts";

const truncateString = (str: string, maxLength?: number) => {
  if (maxLength === undefined) {
    return str;
  }

  if (str.length <= maxLength) {
    return str;
  }

  return str.slice(0, maxLength - 1).trim() + "…";
};

export async function generateText(prompt: string, {
  context = [],
  instructions,
  model = "gemini-2.5-flash-preview-04-17",
  gemini = _gemini,
  characterLimit,
}: PromptParameters = {}): Promise<string> {
  const response = await gemini.models.generateContent({
    model,
    contents: [
      ...context.map((text) => ({
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

  // response.text automatically returns the first candidate
  const citations = response.candidates![0].citationMetadata?.citations;

  if (!citations) {
    return truncateString(response.text, characterLimit);
  }

  let citationText = "\n### Sources";
  for (const { uri } of citations) {
    if (uri) {
      // we use bullet points because Gemini doesn't return all the sources cited
      citationText += `\n- [${uri}](${uri})`;
    }
  }

  return truncateString(
    response.text,
    characterLimit ? characterLimit - citationText.length : undefined,
  ) + citationText;
}
