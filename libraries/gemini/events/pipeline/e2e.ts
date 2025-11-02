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

// TODO: flesh out

import { faker } from "@faker-js/faker";
import {
  type AnyShape,
  type BottChannel,
  type BottEvent,
  type BottEventClassifier,
  type BottEventRule,
  BottEventRuleType,
  BottEventType,
  type BottUser,
} from "@bott/model";

import type { EventPipelineContext, EventPipelineProcessor } from "./types.ts";

// Import the processor you want to test
import { focusInput } from "./01_focusInput/main.ts";

const processorToTest: EventPipelineProcessor = focusInput;

const result = await processorToTest(createMockContext());

console.log(JSON.stringify(result, null, 2));

// Mocks

function createMockUser(): BottUser {
  return {
    id: faker.string.uuid(),
    name: faker.internet.username(),
  };
}

function createMockChannel(): BottChannel {
  return {
    id: faker.string.uuid(),
    name: `#${faker.lorem.word()}`,
    space: {
      id: faker.string.uuid(),
      name: faker.lorem.word(),
    },
  };
}

function createMockEvent(
  user: BottUser,
  channel: BottChannel,
): BottEvent<AnyShape> {
  return {
    id: faker.string.uuid(),
    type: BottEventType.MESSAGE,
    timestamp: faker.date.recent(),
    user,
    channel,
    details: { content: faker.lorem.sentence() },
  };
}

function createMockContext(): EventPipelineContext {
  const user = createMockUser();
  const channel = createMockChannel();
  const classifier: BottEventClassifier = {
    name: "isInteresting",
    definition: "Is the content interesting?",
    examples: { 1: ["boring", "blah"], 5: ["fascinating", "whohoo"] },
  };

  const rule: BottEventRule = {
    name: "onlyLookAtInterestingThings",
    type: BottEventRuleType.FOCUS_INPUT,
    definition: "Only look at events that are interesting.",
    validator: (event) => {
      return (event.details.scores as any).isInteresting === 5;
    },
    requiredClassifiers: [classifier.name],
  };

  return {
    data: {
      input: Array.from({ length: 3 }, () => createMockEvent(user, channel)),
      output: [],
    },
    abortSignal: new AbortController().signal,
    user,
    channel,
    actions: {},
    settings: {
      identity: "I am a test bot.",
      classifiers: { [classifier.name]: classifier },
      rules: {
        [rule.name]: rule,
      },
    },
  };
}
