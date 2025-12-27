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

import { BottEvent, BottEventType } from "@bott/events";
import { log } from "@bott/common";
import type {
  BottChannel,
  BottRatingScale,
  BottReason,
  BottUser,
} from "@bott/model";
import type { BottServiceContext } from "@bott/system";

import { faker } from "@faker-js/faker";

// Import the processor to test
import { focusInput } from "./01_focusInput/main.ts";
import { generateOutput } from "./02_generateOutput/main.ts";
import { segmentOutput } from "./03_segmentOutput/main.ts";
import { filterOutput } from "./04_filterOutput/main.ts";
import { patchOutput } from "./05_patchOutput/main.ts";
import type { EventPipelineContext, EventPipelineProcessor } from "./types.ts";

if (import.meta.main) {
  log.perf("pipeline");

  const pipelineToTest: EventPipelineProcessor[] = [
    focusInput,
    generateOutput,
    segmentOutput,
    filterOutput,
    patchOutput,
  ];

  let result: EventPipelineContext | object = {};

  for (const processor of pipelineToTest) {
    log.perf(processor.name);
    const context = createMockContext();
    await processor.call(context);
    result = context;
    log.perf(processor.name);
  }

  if (!("data" in result)) {
    throw new Error("NO DATA");
  }

  log.debug(result.data);

  log.perf("pipeline");
}

// ---

export function createMockUser(name?: string): BottUser {
  return {
    id: faker.string.uuid(),
    name: name ?? faker.internet.username(),
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

export function createMockContext(): EventPipelineContext {
  const user1 = createMockUser("user1");
  const user2 = createMockUser("user2");
  const bott = createMockUser("bott");
  const channel = createMockChannel();

  const inputEvent1 = new BottEvent(
    BottEventType.MESSAGE,
    {
      detail: { content: "Hello world!" },
      user: user1,
      channel,
      parent: undefined,
    },
  );
  const inputEvent2 = new BottEvent(
    BottEventType.REPLY,
    {
      detail: { content: "Hello to you too!" },
      user: user2,
      channel,
      parent: inputEvent1,
    },
  );
  const inputEvent3 = new BottEvent(
    BottEventType.MESSAGE,
    {
      detail: { content: "What is the capital of France?" },
      user: user1,
      channel,
      parent: undefined,
    },
  );
  const inputEvent4 = new BottEvent(
    BottEventType.REPLY,
    { detail: { content: "Paris, of course." }, parent: inputEvent3 },
  );
  const inputEvent5 = new BottEvent(
    BottEventType.MESSAGE,
    {
      detail: { content: "And what about Germany?", focus: true },
      user: user1,
      channel,
      parent: undefined,
    },
  );

  const outputEvent1 = new BottEvent(
    BottEventType.REPLY,
    { detail: { content: "I can answer that for you." }, parent: inputEvent5 },
  );
  const outputEvent2 = new BottEvent(
    BottEventType.REPLY,
    {
      detail: { content: "The capital of Germany is Berlin." },
      parent: outputEvent1,
    },
  );

  const ratingScale: BottRatingScale = {
    name: "isInteresting",
    definition: "Is the content interesting?",
    examples: { 1: ["boring", "blah"], 5: ["fascinating", "whohoo"] },
  };

  const ratingScale2: BottRatingScale = {
    name: "isCorrect",
    definition: "Is the content correct?",
    examples: { 1: ["<a blatant lie>"], 5: ["<a profound truth>"] },
  };

  const inputRule: BottReason = {
    name: "onlyLookAtInterestingThings",
    description: "Only look at events that are interesting.",
    validator: (metadata) => {
      return metadata?.ratings?.isInteresting === 5;
    },
    ratingScales: [ratingScale],
  };

  const outputRule: BottReason = {
    name: "onlySayCorrectThings",
    description: "Only say things that are correct.",
    validator: (metadata) => {
      return (metadata?.ratings?.isCorrect ?? 0) >= 4;
    },
    ratingScales: [ratingScale2],
  };

  return {
    data: {
      input: [
        inputEvent1,
        inputEvent2,
        inputEvent3,
        inputEvent4,
        inputEvent5,
      ],
      output: [
        outputEvent1,
        outputEvent2,
      ],
    },
    evaluationState: new Map(),
    action: {
      id: "test-action",
      signal: new AbortController().signal,
      settings: {
        name: "test",
        instructions: "test instructions",
      },
      service: {
        user: {
          id: "test-user",
          name: "test-user",
        },
        app: {
          response: {
            identity: "I am a test bot.",
            reasons: {
              input: [inputRule],
              output: [outputRule],
            },
          },
          actions: {},
          events: new Set(),
        },
      } as unknown as BottServiceContext,
      user: bott,
      channel,
    },
  };
}
