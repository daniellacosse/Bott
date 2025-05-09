import { GoogleGenAI } from "npm:@google/genai";

export type PromptParameters = {
  context?: string[];
  model?: string;
  instructions?: string;
  gemini?: GoogleGenAI;
  characterLimit?: number;
};
