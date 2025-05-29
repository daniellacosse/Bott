import type { Content } from "npm:@google/genai";

import gemini from "../client.ts";

type GeminiResponseContext = {
  abortSignal: AbortSignal;
  model?: string;
};

const tokenCache: Record<string, number | undefined> = {};

export const countTokens = async (
  id: string,
  content: Content,
  { model = "gemini-2.5-pro-preview-05-06", abortSignal }:
    GeminiResponseContext,
) => {
  if (!tokenCache[id]) {
    const tokenResponse = await gemini.models.countTokens({
      model,
      contents: content,
      config: {
        abortSignal,
      },
    });

    tokenCache[id] = tokenResponse.totalTokens ?? 0;
  }

  return tokenCache[id];
};
