import type { Chat, Content } from "npm:@google/genai";
import _gemini from "../client.ts";
import type { PromptParameters } from "../types.ts";

export function createChat(history: Content[], {
  instructions,
  model = "gemini-2.5-flash-preview-04-17",
  gemini = _gemini,
}: PromptParameters = {}): Chat {
  return gemini.chats.create({
    model,
    history: history.reverse(),
    config: {
      candidateCount: 1,
      systemInstruction: instructions,
    },
  });
}
