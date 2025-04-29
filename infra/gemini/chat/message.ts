import type { Chat } from "npm:@google/genai";

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
