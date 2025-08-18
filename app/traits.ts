import type { BottTrait, BottUser } from "@bott/model";

export const seriousness: BottTrait = {
  name: "seriousness",
  criteria: [],
  examples: {
    1: ["Joking/Sarcastic", "lol nice"],
    5: ["Very Serious", "A detailed bug report"],
  },
};

export const importance: BottTrait = {
  name: "importance",
  criteria: [],
  examples: {
    1: "Trivial; A 'good morning' message",
    5: "Urgent/Critical; A user reporting 'the system is down and I can't work'",
  },
};

export const directedAt = (user: BottUser): BottTrait => ({
  name: `directedAt${user.name}`,
  criteria: [],
  examples: {
    1: "Ambient Conversation; A message between two other users",
    5: `Direct Command/Question; A message starting with '${user.name}, can you...' `,
  },
});

export const factCheckingNeed: BottTrait = {
  name: "factCheckingNeed",
  criteria: [],
  examples: {
    1: "Opinion/Subjective; 'I love this new design!'",
    5: "Contains Verifiable Claims; 'The documentation says the API limit is 100/hr, but I'm getting cut off at 50'",
  },
};

export const supportNeed: BottTrait = {
  name: "supportNeed",
  criteria: [],
  examples: {
    1: "Informational/Casual; A user sharing a link",
    5: "Direct Request for Help; A user posting an error stack trace and asking 'what does this mean?'",
  },
};

export const relevance: BottTrait = {
  name: "relevance",
  criteria:
    "How well the event relates to the user's message and the recent conversation.",
  examples: {
    1: "Off-Topic",
    5: "Directly Addresses the Context",
  },
};

export const redundancy: BottTrait = {
  name: "redundancy",
  criteria:
    "Does this add new information or perspective compared to the conversation so far AND compared to the other events in *this* response?",
  examples: {
    1: "Repeats Existing Info",
    5: "Provides New Value",
  },
};

export const wordiness: BottTrait = {
  name: "wordiness",
  criteria:
    "How effectively the message communicates its point without unnecessary words.",
  examples: {
    1: "Verbose/Rambling",
    5: "Concise and Clear",
  },
};

export const necessity: BottTrait = {
  name: "necessity",
  criteria:
    "How critical is this specific event? Is it filler, or does it serve a clear purpose (e.g., answering a question, acknowledging a request, providing a required update)?",
  examples: {
    1: "Unnecessary/Filler",
    5: "Essential for the Interaction",
  },
};
