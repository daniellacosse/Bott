import { BottAssetType } from "@bott/model";
import _gemini from "../client.ts";
import type { FileGenerator } from "./types.ts";
import { getFileNameFromDescription, getGeneratedFileUrl } from "./url.ts";

export const generateTextFile: FileGenerator = async (prompt: string, {
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

  const textData = new TextEncoder().encode(sanitizedResponse.text);
  const fileName = `${getFileNameFromDescription(prompt)}.txt`;

  return {
    id: crypto.randomUUID(),
    data: textData,
    name: fileName,
    description: prompt,
    url: getGeneratedFileUrl(fileName),
    type: BottAssetType.TXT,
  };
};
