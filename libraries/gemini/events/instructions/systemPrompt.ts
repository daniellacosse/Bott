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

import type { AnyShape, BottRequestHandler, BottTrait } from "@bott/model";
import type { GeminiEventGenerationContext } from "./types.ts";

export const getSystemPrompt = <O extends AnyShape>({
  user,
  inputTraits,
  outputTraits,
  requestHandlers,
}: GeminiEventGenerationContext<O>) => `
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

${generateTraitMarkdown(inputTraits)}

---

## Phase 2: Generate Initial Response Candidates

Based on your analysis in Phase 1 and your core \`Identity\` and \`Engagement Rules\`, generate a list of potential outgoing events. This is your brainstorming phase.

${generateTraitCriteriaMarkdown(inputTraits)}

### Available Event Types

1.  **\`message\`**: A new, standalone message to the channel.
2.  **\`reply\`**: A direct reply to a specific parent message (will be threaded).
3.  **\`reaction\`**: An emoji reaction to a specific parent message. Prefer these for simple acknowledgments to reduce channel noise.
4.  **\`request\`**: An instruction to the system to call a function. These are asynchronous. It's good practice to send a \`reply\` or \`message\` alongside a \`request\` to inform the user that you've started a longer-running task.

### Available Request Functions

${generateRequestHandlerMarkdown(requestHandlers)}

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

${generateTraitMarkdown(outputTraits)}

---

## Phase 5: Filter Outgoing Events

Apply the following rules **strictly and in order** to the list of scored events from Phase 4. This is the final quality gate.

${generateTraitCriteriaMarkdown(outputTraits)}

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
`;

const generateTraitMarkdown = (traits: Record<string, BottTrait>) => {
  const result = [];

  for (
    const [name, { examples: exampleRecord, description }] of Object.entries(
      traits,
    )
  ) {
    let header = `**\`${name}\`**`;

    if (description) {
      header += `: ${description}`;
    }

    const examples = Object.entries(exampleRecord).flatMap(
      ([value, examples]) =>
        examples.map((example) => `  * ${example} => Score: ${value}`),
    );

    result.push(`* ${header}\n${examples.join("\n")}`);
  }

  return result.join("\n");
};

const generateTraitCriteriaMarkdown = (traits: Record<string, BottTrait>) => {
  return [
    ...new Set(Object.values(traits).flatMap((trait) => trait.criteria ?? [])),
  ]
    .sort()
    .map((criteria) => `* ${criteria}`)
    .join("\n");
};

const generateRequestHandlerMarkdown = <O extends AnyShape>(
  handlers: Record<string, BottRequestHandler<O, AnyShape>>,
) => {
  const result = [];

  for (const [name, handler] of Object.entries(handlers)) {
    let entry = `**\`${name}\`**`;

    if (handler.description) {
      entry += `: ${handler.description}`;
    }

    entry += "\n";

    if (handler.options) {
      entry += "| Option | Description | Type | Allowed Values | Required |\n";
      entry += "|---|---|---|---|\n";

      for (
        const { name, type, description, allowedValues, required } of handler
          .options
      ) {
        entry += `| \`${name}\` | \`${description ?? "-"}\` | ${type} | ${
          allowedValues ? allowedValues.join(", ") : "*"
        } | ${required ? "Yes" : "No"} |\n`;
      }
    }

    result.push(entry);
  }

  return result.join("\n\n");
};
