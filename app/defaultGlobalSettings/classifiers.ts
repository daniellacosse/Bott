/**
 * @license
 * This file is part of Bott.
 *
 * This project is dual-licensed:
 * - Non-commercial use: AGPLv3 (see LICENSE file for full text).
 * - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
 *
 * Copyright (C) 2025 DanielLaCos.se
 */

import type { BottEventClassifier, BottUser } from "@bott/model";

export const directedAt = (user: BottUser): BottEventClassifier => ({
  name: `directedAt${user.name}`,
  definition:
    `Whether the message is directly addressed to "${user.name}". A high score indicates a direct request or question.`,
  examples: {
    1: ["Hey other user, how are you this evening?"],
    3: [
      `I wonder if ${user.name} has anything to say about this?`,
      `lol ${user.name} would love this`,
    ],
    4: [
      "<message of an ongoing conversation with you>",
      "That makes sense, but what about the cost?",
    ],
    5: [
      `Hey ${user.name.toLocaleLowerCase()}, do a dance for me.`,
      `@${user.name}, can you write me a story?`,
    ],
  },
});

export const importance: BottEventClassifier = {
  name: "importance",
  definition:
    "How significant the message's content is to the group or ongoing conversation. A low score is for trivial chatter, a high score is for something that affects the whole group.",
  examples: {
    1: [
      "lol",
      "I'm gonna go grab a snack.",
    ],
    3: [
      "Does anyone have a good recipe for chili?",
      "I'm thinking of starting a new book club channel.",
    ],
    5: [
      "Hey @everyone, we're planning a game night for this Friday!",
      "Important: We're updating the community rules, please read the announcement",
    ],
  },
};

export const urgency: BottEventClassifier = {
  name: "urgency",
  definition:
    "How time-sensitive the message is. A low score is for idle chat, while a high score indicates a need for an immediate response or action.",
  examples: {
    1: [
      "I was thinking we could watch a movie sometime next week.",
      "That game looks so cool, we should play it eventually.",
    ],
    3: [
      "Anyone free to play a match in the next hour?",
      "The poll for the movie night closes tonight!",
    ],
    5: [
      "Is anyone here? I'm having a real-life emergency. @everyone",
      "I need some assistance immediately.",
    ],
  },
};

export const objectivity: BottEventClassifier = {
  name: "objectivity",
  definition:
    "How objective or subjective the message is. A low score indicates a personal feeling or opinion, while a high score indicates a statement presented as a verifiable fact.",
  examples: {
    1: [
      "I love this new design!",
      "That movie was so boring.",
    ],
    5: [
      "I believe women have an average IQ of 110, while men have higher variance.",
      "The Earth revolves around the Sun.",
    ],
  },
};

export const sincerity: BottEventClassifier = {
  name: "sincerity",
  definition:
    "How sincere or genuine the message is. A low score suggests a sarcastic, ironic, or joking tone, while a high score indicates a sincere or heartfelt tone.",
  examples: {
    1: [
      "That's a real masterpiece",
      "Yes, because I believe murder is okay 🙄",
      "LMAO",
      "Oh, I'm *so* sorry for your loss... of the game.",
    ],
    3: [
      "Wow, you finally showed up! We missed you.",
    ],
    5: [
      "Thank you so much for your help, I really appreciate it.",
      "I am really sorry about that.",
    ],
  },
};

export const relevance: BottEventClassifier = {
  name: "relevance",
  definition:
    "How well the message relates to the recent conversation. A low score is for a complete non-sequitur, while a high score directly continues the current topic.",
  examples: {
    1: [
      "Conversation is about favorite movies. User posts: 'My dog is cute.'",
    ],
    3: [
      "Conversation is about 'The Matrix'. User posts: 'Speaking of sci-fi, has anyone seen 'Blade Runner'?'",
    ],
    5: [
      "Conversation is about 'The Matrix'. User posts: 'I think the spoon scene is the most iconic part.'",
    ],
  },
};

export const novelty: BottEventClassifier = {
  name: "novelty",
  definition:
    "The degree to which this message adds new information or a new perspective. A low score indicates redundancy, while a high score introduces a new idea or fact.",
  examples: {
    1: [
      "User A: 'I love pizza.' User B: 'Yeah, pizza is great.'",
    ],
    3: [
      "User A: 'I love pizza.' User B: 'Me too, especially with pineapple.'",
    ],
    5: [
      "User A: 'I love pizza.' User B: 'Did you know the first pizzeria in the US opened in New York in 1905?'",
    ],
  },
};
