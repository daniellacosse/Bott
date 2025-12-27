import type {
  GenerateContentResponse,
} from "@google/genai";


export const parseResult = <O>(response: GenerateContentResponse): O => {
  const [candidate] = response.candidates ?? [];
  const { parts } = candidate.content ?? {};

  let text = "";
  for (const part of parts ?? []) {
    if ("text" in part && typeof part.text === "string") {
      text += part.text;
    }
  }

  // Despite the schema, Gemini may still return a code block.
  return JSON.parse(text.replaceAll(/^```(?:json)?\s*|```\s*$/gi, "")) as O;
};