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

import { BottEventRule, BottEventRuleType, BottUser } from "@bott/model";

// TODO: I think we're missing a general sense of ... friendly conversationalism, but this is a good first draft.

export const whenAddressed: (user: BottUser) => BottEventRule = (user) => ({
  name: "whenAddressed",
  type: BottEventRuleType.FOCUS_INPUT,
  definition:
    `You should respond to events that have a \`directedAt${user.name}\` score of 5, or at 4 when \`importance\` or \`urgency\` is also 4 or greater.`,
  requiredClassifiers: [`directedAt${user.name}`, "importance", "urgency"],
  validator: (event) => {
    const scores = event.details.scores;

    if (!scores) {
      return false;
    }

    const directedAtUser = scores[`directedAt${user.name}`];
    const importance = scores.importance;
    const urgency = scores.urgency;

    return (
      directedAtUser === 5 ||
      (directedAtUser === 4 && (importance >= 4 || urgency >= 4))
    );
  },
});

export const checkFacts: BottEventRule = {
  name: "checkFacts",
  type: BottEventRuleType.FOCUS_INPUT,
  definition:
    "You must fact-check events of `importance` 3 or greater that have an `objectivity` score of 4 or 5",
  requiredClassifiers: ["importance", "objectivity"],
  validator: (event) => {
    const scores = event.details.scores;

    if (!scores) {
      return false;
    }
    const importance = scores.importance;
    const objectivity = scores.objectivity;

    return (
      importance >= 3 && (objectivity === 4 || objectivity === 5)
    );
  },
};

export const avoidTomfoolery: BottEventRule = {
  name: "avoidTomfoolery",
  type: BottEventRuleType.FOCUS_INPUT,
  definition:
    "Avoid engaging with events that have a `sincerity` or `relevance` score of 1 or 2.",
  requiredClassifiers: ["sincerity", "relevance"],
  validator: (event) => {
    const scores = event.details.scores;

    if (!scores) {
      return false;
    }

    const sincerity = scores.sincerity;
    const relevance = scores.relevance;

    return !(sincerity === 1 || sincerity === 2 || relevance === 1 ||
      relevance === 2);
  },
};

export const ensureImportance: BottEventRule = {
  name: "ensureImportance",
  type: BottEventRuleType.FILTER_OUTPUT,
  definition: "You should only send events of `importance` 3 or greater.",
  requiredClassifiers: ["importance"],
  validator: (event) => {
    const scores = event.details.scores;

    if (!scores) {
      return false;
    }

    return scores.importance >= 3;
  },
};

export const ensureValue: BottEventRule = {
  name: "ensureValue",
  type: BottEventRuleType.FILTER_OUTPUT,
  definition:
    "You should only send events of extreme `relevance` and `novelty` - a score of 5 for each.",
  requiredClassifiers: ["relevance", "novelty"],
  validator: (event) => {
    const scores = event.details.scores;

    if (!scores) {
      return false;
    }

    return scores.relevance === 5 && scores.novelty === 5;
  },
};
