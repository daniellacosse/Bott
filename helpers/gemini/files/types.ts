import type { GoogleGenAI } from "npm:@google/genai";

import type { BottOutputFile } from "@bott/model";

export type PromptParameters = {
  abortSignal?: AbortSignal;
  context?: string[];
  model?: string;
  instructions?: string;
  gemini?: GoogleGenAI;
  characterLimit?: number;
};

export type OutputFileGenerator = (
  prompt: string,
  params: PromptParameters,
) => Promise<BottOutputFile>;
