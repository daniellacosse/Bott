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

// For each event in the input that does **not** already have a \`details.scores\` object, evaluate and add one. This prevents re-processing of messages you've already seen.

// ### Scoring Classifiers

// ${
//   getEventClassifierMarkdown(
//     reduceClassifiersForRuleType(
//       context.settings,
//       BottEventRuleType.FOCUS_INPUT,
//     ),
//   )
// }
