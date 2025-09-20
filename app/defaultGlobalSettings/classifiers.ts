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

// TODO: refine

export const seriousness: BottEventClassifier = {
  name: "seriousness",
  definition:
    "How serious or formal the message is. A high score indicates a professional or urgent tone, while a low score suggests a casual or joking manner.",
  examples: {
    1: ["<A joking or sarcastic comment>", "'lol nice'"],
    5: ["<A very serious comment>", "<A detailed bug report>"],
  },
};

export const importance: BottEventClassifier = {
  name: "importance",
  definition:
    "The urgency and impact of the message. A high score means it requires immediate attention, while a low score indicates it's trivial or can be handled later.",
  examples: {
    1: ["<A trivial 'good morning' message>"],
    5: [
      "<An urgent report like 'the system is down and I can't work'>",
    ],
  },
};

export const directedAt = (user: BottUser): BottEventClassifier => ({
  name: `directedAt${user.name}`,
  definition:
    `Whether the message is directly addressed to me (${user.name}). A high score indicates a direct command or question.`,
  examples: {
    1: ["<A message between two other users>"],
    5: [
      `<A direct command starting with '${user.name}, can you...'>`,
    ],
  },
});

export const factCheckingNeed: BottEventClassifier = {
  name: "factCheckingNeed",
  definition:
    "Whether the message contains claims that should be verified. A high score indicates the presence of specific, verifiable facts.",
  examples: {
    1: ["<A subjective opinion like 'I love this new design!'>"],
    5: [
      "<A verifiable claim like 'The docs say the limit is 100/hr, but I'm cut off at 50'>",
    ],
  },
};

export const supportNeed: BottEventClassifier = {
  name: "supportNeed",
  definition:
    "Whether the user is asking for help or assistance. A high score indicates a direct request for support.",
  examples: {
    1: ["<An informational message sharing a link>"],
    5: [
      "<A direct request for help, like posting an error and asking 'what does this mean?'>",
    ],
  },
};

export const relevance: BottEventClassifier = {
  name: "relevance",
  definition:
    "How well the response relates to the user's message and the recent conversation.",
  examples: {
    1: ["<An off-topic or irrelevant response>"],
    5: ["<A response that directly addresses the user's message>"],
  },
};

export const redundancy: BottEventClassifier = {
  name: "redundancy",
  definition:
    "Does this add new information or perspective compared to the conversation so far AND compared to the other events in this response?",
  examples: {
    1: ["<A response that repeats information already stated>"],
    5: ["<A response that provides new information or a fresh perspective>"],
  },
};

export const wordiness: BottEventClassifier = {
  name: "wordiness",
  definition:
    "How effectively the message communicates its point without unnecessary words.",
  examples: {
    1: ["<A verbose or rambling message>"],
    5: ["<A concise and clear message>"],
  },
};

export const necessity: BottEventClassifier = {
  name: "necessity",
  definition:
    "How critical is this specific event? Is it filler, or does it serve a clear purpose (e.g., answering a question, acknowledging a request, providing a required update)?",
  examples: {
    1: ["<An unnecessary or filler message>"],
    5: ["<An essential message that answers a question or fulfills a request>"],
  },
};
