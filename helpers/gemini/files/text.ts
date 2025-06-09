import _gemini from "../client.ts";
import type { OutputFileGenerator } from "./types.ts";

import { BottOutputFileType } from "@bott/model";

// NOTE: This stores output files to disk, even if they
// are not in the database yet.
export const generateTextFile: OutputFileGenerator = async (
  prompt: string,
  {
    model = "gemini-2.5-pro-preview-05-06",
    gemini = _gemini,
    storeOutputFile,
  },
) => {
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

  const outputFile = storeOutputFile(
    new TextEncoder().encode(sanitizedResponse.text),
    BottOutputFileType.TXT,
  );

  return outputFile;
};
