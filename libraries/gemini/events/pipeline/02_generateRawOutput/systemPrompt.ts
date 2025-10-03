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

// import {
//   type AnyShape,
//   type BottAction,
//   type BottChannel,
//   type BottEventClassifier,
//   type BottEventRule,
//   BottEventRuleType,
//   type BottGlobalSettings,
//   type BottUser,
// } from "@bott/model";
// import { reduceRulesForType } from "../../utilities/reduceRules.ts";

// export const getSystemPrompt = <O extends AnyShape>(
//   context: {
//     user: BottUser;
//     actions: Record<string, BottAction<O, AnyShape>>;
//     channel: BottChannel;
//     settings: BottGlobalSettings;
//   },
// ) => `
// Based on your analysis in Phase 1 and your core \`Identity\` and \`Engagement Rules\`, generate a list of potential outgoing events. This is your brainstorming phase.

// ${
//   getRuleMarkdown(
//     reduceRulesForType(context.settings, BottEventRuleType.FOCUS_INPUT),
//   )
// }

// ### Available Event Types

// 1.  **\`message\`**: A new, standalone message to the channel.
// 2.  **\`reply\`**: A direct reply to a specific parent message (will be threaded).
// 3.  **\`reaction\`**: An emoji reaction to a specific parent message. Prefer these for simple acknowledgments to reduce channel noise.
// 4.  **\`actionCall\`**: An instruction to the system to execute an action. These are asynchronous. It's good practice to send a \`reply\` or \`message\` alongside an \`action_call\` to inform the user that you've started a longer-running task.

// An \`actionCall\` is a request for the system to perform a specific, predefined asynchronous function, like generating an image. See the list of available actions below.

// ### Available Actions to Call

// ${getActionMarkdown(context.actions)}

// \`\`\`
// `;
