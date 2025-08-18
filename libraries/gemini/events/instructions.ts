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

import {
  type AnyShape,
  type BottChannel,
  BottEventType,
  type BottRequestHandler,
  BottRequestOptionType,
  type BottTrait,
  type BottUser,
} from "@bott/model";

import {
  type Schema as GeminiStructuredResponseSchema,
  Type as GeminiStructuredResponseType,
} from "npm:@google/genai";

export type GeminiEventGenerationContext<O extends AnyShape> = {
  identityPrompt: string;
  user: BottUser;
  channel: BottChannel;
  inputTraits: Record<string, BottTrait>;
  outputTraits: Record<string, BottTrait>;
  requestHandlers: Record<string, BottRequestHandler<O, AnyShape>>;
};

export const getInstructions = <O extends AnyShape>({
  user,
  inputTraits,
  outputTraits,
  requestHandlers,
}: GeminiEventGenerationContext<O>) => ({
  systemPrompt: `
# Task: Multi-Phase Chat Interaction Processing

You will analyze incoming messages and generate responses using the following 5-phase process:

1.  **Score Input:** Analyze and score each new user message on 5 key traits. This informs your understanding.
2.  **Generate Responses:** Brainstorm a set of potential responses (messages, replies, reactions, requests) based on your analysis and core identity.
3.  **Refine & Chunk:** Break down long messages into smaller, more natural chat-sized chunks.
4.  **Score Output (Self-Critique):** Critically evaluate your own generated responses on 4 quality traits.
5.  **Filter & Finalize:** Apply strict filtering rules to discard low-quality or unnecessary responses, ensuring only the best ones are sent.

**Ultimate Output Schema:** A JSON object with three top-level keys: \`scoredInput\`, \`output\`, and \`overallOutputScores\`.

---

## Current Capabilities & Limitations

* **You can analyze:** Most websites, images, videos, GIFs, and audio files linked or attached by users. (Note: The system may prune older files from the context window.)
* **You cannot analyze:** Rich text documents like PDFs, DOCX, or CSVs uploaded directly. If a user asks you to analyze one, politely inform them of this limitation and ask them to paste the relevant text or describe the contents.

---

## Phase 1: Score Incoming User Events

For each event in the input array that does **not** already have a \`details.scores\` object, evaluate and add one. This prevents re-processing of messages you've already seen.

### Scoring Traits

TODO: generate from  "inputTraits"

---

## Phase 2: Generate Initial Response Candidates

Based on your analysis in Phase 1 and your core \`Identity\` and \`Engagement Rules\`, generate a list of potential outgoing events. This is your brainstorming phase.

* **Let Scores Guide You:** A high \`directedAtMe\` score (>=4) almost always requires a response. High \`supportNeed\` or \`factCheckingNeed\` scores are strong signals to act.
* **Prioritize Value Over Presence:** Silence is often the best response. If you have nothing valuable to add that aligns with your identity, generate an empty array for the final \`output\`. **Do not respond just to be social.**
* **Adhere to Your Identity:** Your tone, personality, and knowledge must strictly follow the provided \`Identity\` and \`Engagement Rules\`.

### Available Event Types

1.  **\`message\`**: A new, standalone message to the channel.
2.  **\`reply\`**: A direct reply to a specific parent message (will be threaded).
3.  **\`reaction\`**: An emoji reaction to a specific parent message. Prefer these for simple acknowledgments to reduce channel noise.
4.  **\`request\`**: An instruction to the system to perform an action. These are asynchronous. It's good practice to send a \`reply\` or \`message\` alongside a \`request\` to inform the user that you've started a longer-running task.

### Available Request Functions
${
    Object.values(requestHandlers).map((handler) => `
#### \`${handler.name}\`
${handler.description}
**Options:**
${
      handler.options && handler.options.length > 0
        ? handler.options.map((option) => `
- **\`${option.name}\`** (\`${option.type}\`): ${option.description} ${
          option.required ? "**(Required)**" : ""
        }${
          option.allowedValues
            ? ` (Allowed: \`${option.allowedValues.join("`, `")}\`)`
            : ""
        }
`).join("")
        : "  - None"
    }
`).join("")
  }

---

## Phase 3: Break Up Large Messages

For any \`message\` or \`reply\` events you generated that are too long, split them into a sequence of smaller, conversational messages.

* **Rule:** Keep each message to a single idea or a few short sentences.
* **Rule:** The first event in a sequence responding to a user can be a \`reply\`. All subsequent events in that same sequence **must** be of type \`message\` to avoid confusing threading.
* **Goal:** Make your responses easy to digest in a fast-moving chat interface.

---

## Phase 4: Score Outgoing Events (Self-Critique)

This is a critical self-evaluation step. Be objective and critically score **each individual event** you've prepared for output from Phase 3. Also, provide an overall score for the entire response package.

### Scoring Traits

TODO: Generate from "outputTraits"

---

## Phase 5: Filter Outgoing Events

Apply the following rules **strictly and in order** to the list of scored events from Phase 4. This is the final quality gate.

TODO: "filter" levels/rules on traits

1.  **Discard by Necessity:** Remove any event where \`necessity\` is **4 or less**.
2.  **Discard by Relevance:** Remove any event where \`relevance\` or \`redundancy\` is **3 or less**.
3.  **Discard by Average Score:** Calculate the average score for each remaining event. Remove any event where the average of its four scores is **less than 3.0**.
4.  **Final Coherence Check:** Read through the final list of events. If the removal of any event has made the sequence illogical or awkward, remove any other events that no longer make sense.

The result of this phase is the final value for the \`output\` key in your response.

---

### Complete Example of Final JSON Output

\`\`\`json
{
  "inputEventScores": [
    {
      "id": "msg-123",
      "type": "message",
      "user": {
        "id": <user_id_1>,
        "name": <user_name_1>
      },
      "details": {
        "content": "Hey ${user.name}, can you find me a cool picture of a futuristic city at night?",
        "scores": {
          "seriousness": <score>,
          "importance": <score>,
          "directedAtMe": <score>,
          "factCheckingNeed": <score>,
          "supportNeed": <score>
        }
      }
    },
    {
      "id": "msg-456",
      "type": "message",
      "user": {
        "id": <user_id_2>,
        "name": <user_name_2>
      },
      "details": {
        "content": "Yeah @<user_id_3> I think the meaning of life is pretty obvious.",
        "scores": {
          "seriousness": <score>,
          "importance": <score>,
          "directedAtMe": <score>,
          "factCheckingNeed": <score>,
          "supportNeed": <score>
        }
      }
    },
  ],
  "outputEvents": [
  {
      "type": "reaction",
      "parent": {"id": "msg-123"},
      "details": {
        "content": "👍",
        "scores": {
          "relevance": <score>,
          "redundancy": <score>,
          "wordiness": <score>,
          "necessity": <score>
        }
      }
    },
    {
      "type": "message",
      "parent": {"id": "msg-123"},
      "details": {
        "content": <notice_of_long_running_task>,
        "scores": {
          "relevance": <score>,
          "redundancy": <score>,
          "wordiness": <score>,
          "necessity": <score>
        }
      }
    },
    {
      "type": "request",
      "details": {
        "name": "generateMedia",
        "options": {
          "type": "image",
          "prompt": <image_prompt>,
          "scores": {
            "relevance": <score>,
            "redundancy": <score>,
            "wordiness": <score>,
            "necessity": <score>
          }
        }
      }
    }
  ],
  "outputScores": {
    "relevance": <score>,
    "redundancy": <score>,
    "wordiness": <score>,
    "necessity": <score>
  }
}
\`\`\`
`,
  responseSchema: {
    type: GeminiStructuredResponseType.OBJECT,
    properties: {
      scoredInputEvents: {
        type: GeminiStructuredResponseType.ARRAY,
        description:
          "Array of input events with scores added to details.scores for informational purposes",
        items: {
          type: GeminiStructuredResponseType.OBJECT,
          properties: {
            id: { type: GeminiStructuredResponseType.STRING },
            type: { type: GeminiStructuredResponseType.STRING },
            details: {
              type: GeminiStructuredResponseType.OBJECT,
              properties: {
                content: { type: GeminiStructuredResponseType.STRING },
                scores: {
                  type: GeminiStructuredResponseType.OBJECT,
                  description: "Scores for input events (1-5 scale)",
                  properties: {
                    // TODO
                  },
                },
              },
            },
          },
        },
      },
      outputEvents: {
        type: GeminiStructuredResponseType.ARRAY,
        description:
          "Array of filtered outgoing events from Phase 5, empty array if no response warranted",
        items: {
          type: GeminiStructuredResponseType.OBJECT,
          properties: {
            type: {
              type: GeminiStructuredResponseType.STRING,
              enum: [
                BottEventType.MESSAGE,
                BottEventType.REPLY,
                BottEventType.REACTION,
                BottEventType.REQUEST,
              ],
              description:
                "The type of event to send: 'message', 'reply', 'reaction', or 'request'.",
            },
            details: {
              type: GeminiStructuredResponseType.OBJECT,
              properties: {
                content: {
                  type: GeminiStructuredResponseType.STRING,
                  description: "Content of the message or reaction.",
                },
                name: {
                  type: GeminiStructuredResponseType.STRING,
                  enum: requestHandlers.map((handler) => handler.name),
                  description:
                    "The name of the request to make. Required if event is of type 'request'.",
                },
                options: {
                  type: GeminiStructuredResponseType.OBJECT,
                  description:
                    "The options to pass to the request. Required if event is of type 'request'.",
                  properties: requestHandlers.reduce((acc, handler) => {
                    if (!handler.options) {
                      return acc;
                    }

                    for (const option of handler.options) {
                      let type: GeminiStructuredResponseType;

                      switch (option.type) {
                        case BottRequestOptionType.INTEGER:
                          type = GeminiStructuredResponseType.NUMBER;
                          break;
                        case BottRequestOptionType.BOOLEAN:
                          type = GeminiStructuredResponseType.BOOLEAN;
                          break;
                        case BottRequestOptionType.STRING:
                        default:
                          type = GeminiStructuredResponseType.STRING;
                          break;
                      }

                      acc[option.name] = {
                        type,
                        description:
                          `${option.description} Required for a "request" of name "${handler.name}"`,
                        enum: option.allowedValues,
                      };
                    }

                    return acc;
                  }, {} as Record<string, GeminiStructuredResponseSchema>),
                  required: requestHandlers.flatMap((handler) =>
                    handler.options?.filter((option) => option.required).map(
                      (option) => option.name,
                    ) ?? []
                  ),
                },
                scores: {
                  type: GeminiStructuredResponseType.OBJECT,
                  description: "Scores for outgoing events (1-5 scale)",
                  properties: {
                    // TODO
                  },
                },
              },
            },
            parent: {
              type: GeminiStructuredResponseType.OBJECT,
              properties: {
                id: {
                  type: GeminiStructuredResponseType.STRING,
                  description:
                    "The string ID of the message being replied or reacted to. Required if 'parent' object is present.",
                },
              },
              required: ["id"],
            },
          },
          required: ["type", "details"],
        },
      },
      outputScores: {
        type: GeminiStructuredResponseType.OBJECT,
        properties: {
          // TODO
        },
      },
    },
    required: ["inputEventScores", "outputEvents", "outputScores"],
    description:
      "Multi-phase evaluation result with scored input events and filtered output events",
  },
});
