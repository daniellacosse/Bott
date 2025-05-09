import type { Chat } from "npm:@google/genai";

import type { BottChannel, BottEvent } from "@bott/data";

export async function messageChat(
  message: string,
  chat: Chat,
): Promise<string> {
  const response = await chat.sendMessage({ message });

  if (!response.text) {
    throw new Error("No text in response");
  }

  return response.text;
}

export const messageChannel = async (
  channel: BottChannel,
  instructions: string,
): Promise<BottEvent> => {
  // 1. get chat history

  // 2. create chat

  // 3. messageChat

  // 4. return event
};