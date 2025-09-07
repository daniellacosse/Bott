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

import type { BottTrait, BottUser } from "@bott/model";

// TODO: refine

export const seriousness: BottTrait = {
  name: "seriousness",
  description:
    "How serious or formal the message is. A high score indicates a professional or urgent tone, while a low score suggests a casual or joking manner.",
  criteria: [
    "Score messages with jokes, sarcasm, or casual language (e.g., 'lol', 'sup') as 1.",
    "Score messages with formal language, detailed bug reports, or urgent requests as 5.",
  ],
  examples: {
    1: ["<A joking or sarcastic comment>", "'lol nice'"],
    5: ["<A very serious comment>", "<A detailed bug report>"],
  },
};

export const importance: BottTrait = {
  name: "importance",
  description:
    "The urgency and impact of the message. A high score means it requires immediate attention, while a low score indicates it's trivial or can be handled later.",
  criteria: [
    "Score trivial messages like 'good morning' or simple agreements as 1.",
    "Score critical messages, such as system outages or major blockers, as 5.",
  ],
  examples: {
    1: ["<A trivial 'good morning' message>"],
    5: [
      "<An urgent report like 'the system is down and I can't work'>",
    ],
  },
};

export const directedAt = (user: BottUser): BottTrait => ({
  name: `directedAt${user.name}`,
  description:
    `Whether the message is directly addressed to me (${user.name}). A high score indicates a direct command or question.`,
  criteria: [
    `Score messages that do not mention me or are part of a conversation between others as 1.`,
    `Score messages that start with my name ('${user.name}, ...') or directly @-mention me with a question or command as 5.`,
  ],
  examples: {
    1: ["<A message between two other users>"],
    5: [
      `<A direct command starting with '${user.name}, can you...'>`,
    ],
  },
});

export const factCheckingNeed: BottTrait = {
  name: "factCheckingNeed",
  description:
    "Whether the message contains claims that should be verified. A high score indicates the presence of specific, verifiable facts.",
  criteria: [
    "Score subjective opinions or personal feelings (e.g., 'I love this') as 1.",
    "Score messages containing data, statistics, or claims that can be cross-referenced (e.g., 'The API limit is 100/hr') as 5.",
  ],
  examples: {
    1: ["<A subjective opinion like 'I love this new design!'>"],
    5: [
      "<A verifiable claim like 'The docs say the limit is 100/hr, but I'm cut off at 50'>",
    ],
  },
};

export const supportNeed: BottTrait = {
  name: "supportNeed",
  description:
    "Whether the user is asking for help or assistance. A high score indicates a direct request for support.",
  criteria: [
    "Score informational messages or casual link sharing as 1.",
    "Score direct requests for help, such as questions about errors or how to do something, as 5.",
  ],
  examples: {
    1: ["<An informational message sharing a link>"],
    5: [
      "<A direct request for help, like posting an error and asking 'what does this mean?'>",
    ],
  },
};

export const relevance: BottTrait = {
  name: "relevance",
  description:
    "How well the response relates to the user's message and the recent conversation.",
  criteria: ["Filter out responses with a relevance score below 4."],
  examples: {
    1: ["<An off-topic or irrelevant response>"],
    5: ["<A response that directly addresses the user's message>"],
  },
};

export const redundancy: BottTrait = {
  name: "redundancy",
  description:
    "Does this add new information or perspective compared to the conversation so far AND compared to the other events in this response?",
  criteria: ["Filter out responses with a redundancy score of 1 or 2."],
  examples: {
    1: ["<A response that repeats information already stated>"],
    5: ["<A response that provides new information or a fresh perspective>"],
  },
};

export const wordiness: BottTrait = {
  name: "wordiness",
  description:
    "How effectively the message communicates its point without unnecessary words.",
  criteria: ["Filter out responses with a wordiness score of 1 or 2."],
  examples: {
    1: ["<A verbose or rambling message>"],
    5: ["<A concise and clear message>"],
  },
};

export const necessity: BottTrait = {
  name: "necessity",
  description:
    "How critical is this specific event? Is it filler, or does it serve a clear purpose (e.g., answering a question, acknowledging a request, providing a required update)?",
  criteria: ["Filter out responses with a necessity score below 3."],
  examples: {
    1: ["<An unnecessary or filler message>"],
    5: ["<An essential message that answers a question or fulfills a request>"],
  },
};
