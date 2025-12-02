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
  objectivity,
  potentialImpact,
  relevance,
  sincerity,
  urgency,
  visibility,
} from "./ratingScales.ts";

export const whenAddressed: (user: BottUser) => BottReason = (user) => ({
  name: "whenAddressed",
  definition:
    `You should respond to events that have a \`directedAt${user.name}\` rating of 5 or 4, or at 3 when \`visibility\` or \`urgency\` is also 4 or greater.`,
  instruction: "You have been addressed. Reply to this message.",
  ratingScales: [directedAt(user), visibility, urgency],
  validator: (metadata) => {
    const ratings = metadata?.ratings;

    if (!ratings) {
      return false;
    }

    const directedAtUser = ratings[`directedAt${user.name}`];
    const visibility = ratings.visibility;
    const urgency = ratings.urgency;

    return (
      directedAtUser === 5 ||
      directedAtUser === 4 ||
      (directedAtUser === 3 && (visibility >= 4 || urgency >= 4))
    );
  },
});

export const checkFacts: BottReason = {
  name: "checkFacts",
  definition:
    "You must fact-check events of `visibility` 3 or greater that have an `objectivity` rating of 4 or 5 but avoid engaging with events that have a `sincerity` or `relevance` rating of 1 or 2.",
  instruction:
    "This message contains objective claims. Verify them if necessary.",
  ratingScales: [visibility, objectivity, sincerity, relevance],
  validator: (metadata) => {
    const ratings = metadata?.ratings;

    if (!ratings) {
      return false;
    }

    const { visibility, objectivity, sincerity, relevance } = ratings;

    return (
      visibility >= 3 && (objectivity === 4 || objectivity === 5) &&
      !(sincerity === 1 || sincerity === 2 || relevance === 1 ||
        relevance === 2)
    );
  },
};

export const ensurePotentialImpact: BottReason = {
  name: "ensurePotentialImpact",
  definition:
    "You should only send events with a `potentialImpact` 4 or greater.",
  instruction: "Ensure your response has high potential impact.",
  ratingScales: [potentialImpact],
  validator: (metadata) => {
    const ratings = metadata?.ratings;

    if (!ratings) {
      return false;
    }

    return ratings.potentialImpact >= 4;
  },
};
