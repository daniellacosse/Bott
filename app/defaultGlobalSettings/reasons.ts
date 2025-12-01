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

import { BottReason, BottUser } from "@bott/model";

import {
  directedAt,
  importance,
  objectivity,
  relevance,
  sincerity,
  urgency,
} from "./classifiers.ts";

export const whenAddressed: (user: BottUser) => BottReason = (user) => ({
  name: "whenAddressed",
  definition:
    `You should respond to events that have a \`directedAt${user.name}\` score of 5 or 4, or at 3 when \`importance\` or \`urgency\` is also 4 or greater.`,
  classifiers: [directedAt(user), importance, urgency],
  validator: (event) => {
    const scores = event.details.scores as Record<string, number> | undefined;

    if (!scores) {
      return false;
    }

    const directedAtUser = scores[`directedAt${user.name}`];
    const importance = scores.importance;
    const urgency = scores.urgency;

    return (
      directedAtUser === 5 ||
      directedAtUser === 4 ||
      (directedAtUser === 3 && (importance >= 4 || urgency >= 4))
    );
  },
});

export const checkFacts: BottReason = {
  name: "checkFacts",
  definition:
    "You must fact-check events of `importance` 3 or greater that have an `objectivity` score of 4 or 5 but avoid engaging with events that have a `sincerity` or `relevance` score of 1 or 2.",
  classifiers: [importance, objectivity, sincerity, relevance],
  validator: (event) => {
    const scores = event.details.scores as Record<string, number> | undefined;

    if (!scores) {
      return false;
    }

    const { importance, objectivity, sincerity, relevance } = scores;

    return (
      importance >= 3 && (objectivity === 4 || objectivity === 5) &&
      !(sincerity === 1 || sincerity === 2 || relevance === 1 ||
        relevance === 2)
    );
  },
};

export const ensureImportance: BottReason = {
  name: "ensureImportance",
  definition: "You should only send events of `importance` 3 or greater.",
  classifiers: [importance],
  validator: (event) => {
    const scores = event.details.scores as Record<string, number> | undefined;

    if (!scores) {
      return false;
    }

    return scores.importance >= 3;
  },
};
