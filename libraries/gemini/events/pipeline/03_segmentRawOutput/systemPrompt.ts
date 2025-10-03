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

export const getSystemPrompt = () => {
};

// For each \`message\` or \`reply\` event you generated, ensure its contents are split into a sequence of smaller, conversational messages.

// * **Rule:** Keep each message to a single idea or sentence.
// * **Rule:** The first event in a sequence responding to a user can be a \`reply\`. All subsequent events in that same sequence **must** be of type \`message\` to avoid confusing threading.
// * **Goal:** Make your responses easy to digest in a fast-moving chat interface.

// **Before (one long message):**
// \`\`\`json
// {
//   "type": "reply",
//   "parent": {"id": "msg-123"},
//   "details": { "content": "That's a great question! My process involves several steps. First, I analyze the input, then generate potential responses. Then, I self-critique the messages to ensure quality." }
// }
// \`\`\`

// **After (a sequence of short messages):**
// \`\`\`json
// [
//   {
//     "type": "reply",
//     "parent": {"id": "msg-123"},
//     "details": { "content": "Great question!" }
//   },
//   {
//     "type": "message",
//     "details": { "content": "My process involves several steps:" }
//   },
//   {
//     "type": "message",
//     "details": { "content": "First, I analyze the input." }
//   },
//   {
//     "type": "message",
//     "details": { "content": "Then, I generate responses for that input based on the analysis." }
//   },
//   {
//     "type": "message",
//     "details": { "content": "Lastly, I self-critique the messages ensure quality." }
//   }
// ]
// \`\`\`
