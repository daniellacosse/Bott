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

import { log } from "@bott/log";
import {
  type AnyShape,
  type BottChannel,
  type BottEvent as BottEventInterface,
  BottEventType,
  type BottRatingScale,
  type BottReason,
  type BottUser,
} from "@bott/model";
import { BottServiceEvent } from "@bott/services";
import type { BottServiceContext } from "@bott/services";

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

  log.debug("--- INPUT ---", result.data.input);

  log.debug("--- OUTPUT ---", result.data.output);

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

function createMockEvent(
  user: BottUser,
  channel: BottChannel,
  type: BottEventType,
  details?: AnyShape,
  parent?: BottEventInterface,
): BottEventInterface {
  return new BottServiceEvent(type, {
    detail: details ?? { content: faker.lorem.sentence() },
    user: user,
    channel: channel,
    parent: parent,
  });
}

export function createMockContext(): EventPipelineContext {
  const user1 = createMockUser("user1");
  const user2 = createMockUser("user2");
  const bott = createMockUser("bott");
  const channel = createMockChannel();

  const inputEvent1 = createMockEvent(
    user1,
    channel,
    BottEventType.MESSAGE,
    { content: "Hello world!" },
  );
  const inputEvent2 = createMockEvent(
    user2,
    channel,
    BottEventType.REPLY,
    { content: "Hello to you too!" },
    inputEvent1,
  );
  const inputEvent3 = createMockEvent(
    user1,
    channel,
    BottEventType.MESSAGE,
    { content: "What is the capital of France?" },
  );
  const inputEvent4 = createMockEvent(
    user2,
    channel,
    BottEventType.REPLY,
    { content: "Paris, of course." },
    inputEvent3,
  );
  const inputEvent5 = createMockEvent(
    user1,
    channel,
    BottEventType.MESSAGE,
    { content: "And what about Germany?", focus: true },
  );

  const outputEvent1 = createMockEvent(
    bott,
    channel,
    BottEventType.REPLY,
    { content: "I can answer that for you." },
    inputEvent5,
  );
  const outputEvent2 = createMockEvent(
    bott,
    channel,
    BottEventType.REPLY,
    { content: "The capital of Germany is Berlin." },
    outputEvent1,
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

  const generateMedia = function (context: object) {
    return context;
  };

  generateMedia.description = "Generate media based on a prompt.";
  generateMedia.options = [
    {
      name: "prompt",
      description: "The prompt to send to the model.",
      type: "string",
      required: true,
    },
    {
      name: "type",
      description: "The type of media to generate.",
      type: "string",
      allowedValues: ["image", "audio", "video"],
      required: true,
    },
  ];

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
        user: bott,
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
