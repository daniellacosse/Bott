import type { GoogleGenAI } from "npm:@google/genai";

import type { BottOutputFile } from "@bott/model";
import type { storeOutputFile } from "@bott/storage";

export type PromptParameters = {
  abortSignal?: AbortSignal;
  context?: string[];
  model?: string;
  instructions?: string;
  gemini?: GoogleGenAI;
  characterLimit?: number;
  storeOutputFile: typeof storeOutputFile;
};

export type OutputFileGenerator = (
  prompt: string,
  params: PromptParameters,
) => Promise<BottOutputFile>;
