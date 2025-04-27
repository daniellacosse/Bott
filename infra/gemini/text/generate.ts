import _gemini from "../client.ts";
import type { PromptParameters } from "../types.ts";

const ESTIMATED_CHARACTERS_PER_TOKEN = 4;

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
      maxOutputTokens: characterLimit !== undefined
        ? Math.floor(characterLimit / ESTIMATED_CHARACTERS_PER_TOKEN)
        : undefined,
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

  let citationText = "";
  if (citations) {
    citationText = "\n### Sources";

    for (const { uri } of citations) {
      if (!uri) {
        continue;
      }

      citationText += `\n- [${uri}](${uri})`;
    }
  }

  let result = "";
  if (characterLimit !== undefined && citations) {
    result += response.text.slice(0, characterLimit - citationText.length - 1);
  } else if (characterLimit !== undefined) {
    result += response.text.slice(0, characterLimit - 1);
  }

  if (result.length < response.text.length) {
    result += "…";
  }

  return result + citationText;
}
