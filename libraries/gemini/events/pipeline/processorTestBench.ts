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

import { faker } from "npm:@faker-js/faker";
import {
  type AnyShape,
  type BottChannel,
  type BottEvent,
  type BottEventClassifier,
  BottEventRuleType,
  BottEventType,
  type BottUser,
} from "@bott/model";

import type { EventPipelineContext, EventPipelineProcessor } from "./types.ts";

// Import the processors you might want to test
import { curateInputEvents } from "./01_curateInputEvents/main.ts";
// import { generateRawOutput } from "./02_generateRawOutput/main.ts";
// import { segmentRawOutput } from "./03_segmentRawOutput/main.ts";
// import { classifyOutputEvents } from "./04_classifyOutputEvents/main.ts";
// import { finalizeOutputEvents } from "./05_finalizeOutputEvents/main.ts";

const processorToTest: EventPipelineProcessor = curateInputEvents;

const result = await processorToTest(createMockContext());

console.log(JSON.stringify(result, null, 2));

// Mocks

const createMockUser = (): BottUser => ({
  id: faker.string.uuid(),
  name: faker.internet.username(),
});

const createMockChannel = (): BottChannel => ({
  id: faker.string.uuid(),
  name: `#${faker.lorem.word()}`,
  space: {
    id: faker.string.uuid(),
    name: faker.lorem.word(),
  },
});

const createMockEvent = (
  user: BottUser,
  channel: BottChannel,
): BottEvent<AnyShape> => ({
  id: faker.string.uuid(),
  type: BottEventType.MESSAGE,
  timestamp: faker.date.recent(),
  user,
  channel,
  details: { content: faker.lorem.sentence() },
});

function createMockContext(): EventPipelineContext {
  const user = createMockUser();
  const channel = createMockChannel();
  const classifier: BottEventClassifier = {
    name: "isInteresting",
    definition: "Is the content interesting?",
    examples: { 1: ["boring"], 5: ["fascinating"] },
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
        testRule: {
          name: "testRule",
          type: BottEventRuleType.FILTER_OUTPUT,
          definition: "isInteresting > 3",
          requiredClassifiers: [classifier.name],
        },
      },
    },
  };
}
