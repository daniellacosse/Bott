import type { BottAsset } from "@bott/model";
import type { GoogleGenAI } from "npm:@google/genai";

export type PromptParameters = {
  abortSignal?: AbortSignal;
  context?: string[];
  model?: string;
  instructions?: string;
  gemini?: GoogleGenAI;
  characterLimit?: number;
};

export type FileGenerator = (
  prompt: string,
  params: PromptParameters,
) => Promise<BottAsset>;
