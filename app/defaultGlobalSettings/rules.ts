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

import { BottEventRule, BottEventRuleType } from "@bott/model";

// TODO: I think we're missing a general sense of ... friendly conversationalism, but this is a good first draft.

export const whenAddressed: BottEventRule = {
  name: "whenAddressed",
  type: BottEventRuleType.FOCUS_INPUT,
  definition:
    "You should respond to events that have a `directedAtBott` score of 5, or at 4 when `importance` or `urgency` is also 4 or greater.",
  requiredClassifiers: ["directedAtBott", "importance", "urgency"],
};

export const checkFacts: BottEventRule = {
  name: "checkFacts",
  type: BottEventRuleType.FOCUS_INPUT,
  definition:
    "You must fact-check events of `importance` 3 or greater that have an `objectivity` score of 4 or 5",
  requiredClassifiers: ["importance", "objectivity"],
};

export const avoidTomfoolery: BottEventRule = {
  name: "avoidTomfoolery",
  type: BottEventRuleType.FOCUS_INPUT,
  definition:
    "Avoid engaging with events that have a `sincerity` or `relevance` score of 1 or 2.",
  requiredClassifiers: ["sincerity", "relevance"],
};

export const ensureImportance: BottEventRule = {
  name: "ensureImportance",
  type: BottEventRuleType.FILTER_OUTPUT,
  definition: "You should only send events of `importance` 3 or greater.",
  requiredClassifiers: ["importance"],
};

export const ensureValue: BottEventRule = {
  name: "ensureValue",
  type: BottEventRuleType.FILTER_OUTPUT,
  definition:
    "You should only send events of extreme `relevance` and `novelty` - a score of 5 for each.",
  requiredClassifiers: ["relevance", "novelty"],
};
