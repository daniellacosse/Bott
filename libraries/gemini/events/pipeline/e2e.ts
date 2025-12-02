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

import { faker } from "@faker-js/faker";
import {
  type AnyShape,
  type BottAction,
  BottActionOptionType,
  type BottChannel,
  type BottEvent,
  BottEventType,
  type BottRatingScale,
  type BottReason,
  type BottUser,
} from "@bott/model";
import { log } from "@bott/logger";

import type { EventPipelineContext, EventPipelineProcessor } from "./types.ts";

// Import the processor to test
import { focusInput } from "./01_focusInput/main.ts";
import { generateOutput } from "./02_generateOutput/main.ts";
import { segmentOutput } from "./03_segmentOutput/main.ts";
import { filterOutput } from "./04_filterOutput/main.ts";
import { patchOutput } from "./05_patchOutput/main.ts";

const pipelineStart = performance.now();
log.perf("pipeline: start");

const pipelineToTest: EventPipelineProcessor[] = [
  focusInput,
  generateOutput,
  segmentOutput,
  filterOutput,
  patchOutput,
];

let result: EventPipelineContext | object = {};

for (const processor of pipelineToTest) {
  const processorStart = performance.now();
  log.perf(`${processor.name}: start`);
  result = await processor(createMockContext());
  const processorEnd = performance.now();
  log.perf(
    `${processor.name}: end (${(processorEnd - processorStart).toFixed(2)}ms)`,
  );
}

if (!("data" in result)) {
  throw new Error("NO DATA");
}

log.debug("--- INPUT ---");
result.data.input.forEach(printEvent);

log.debug("\n--- OUTPUT ---");
result.data.output.forEach(printEvent);

const pipelineEnd = performance.now();
log.perf(`pipeline: end (${(pipelineEnd - pipelineStart).toFixed(2)}ms)`);

// ---

function printEvent(event: BottEvent<AnyShape>) {
  const details = event.details as {
    content?: string;
    ratings?: Record<string, number>;
    focus?: boolean;
    output?: boolean;
  };

  const parts = [
    `[${event.type.padEnd(8)}]`,
    `${(event.user?.name ?? "bott").padEnd(8)}:`,
    details.content ? `'${details.content}'` : "(no content)",
  ];

  const metadata: string[] = [];
  if (details.ratings) {
    metadata.push(`ratings: ${JSON.stringify(details.ratings)}`);
  }
  if (typeof details.focus === "boolean") {
    metadata.push(`focus: ${details.focus}`);
  }
  if (typeof details.output === "boolean") {
    metadata.push(`output: ${details.output}`);
  }

  if (metadata.length > 0) parts.push(`{ ${metadata.join(", ")} }`);

  console.log(parts.join(" "));
}

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
  parent?: BottEvent,
): BottEvent<AnyShape> {
  return {
    id: faker.string.uuid(),
    type,
    createdAt: faker.date.recent(),
    user,
    channel,
    details: details ?? { content: faker.lorem.sentence() },
    parent,
  };
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
    definition: "Only look at events that are interesting.",
    validator: (metadata) => {
      return metadata?.ratings?.isInteresting === 5;
    },
    ratingScales: [ratingScale],
  };

  const outputRule: BottReason = {
    name: "onlySayCorrectThings",
    definition: "Only say things that are correct.",
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
      type: BottActionOptionType.STRING,
      required: true,
    },
    {
      name: "type",
      description: "The type of media to generate.",
      type: BottActionOptionType.STRING,
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
    abortSignal: new AbortController().signal,
    user: bott,
    channel,
    actions: {
      generateMedia: generateMedia as BottAction<AnyShape, AnyShape>,
    },
    settings: {
      identity: "I am a test bot.",
      reasons: {
        input: [inputRule],
        output: [outputRule],
      },
    },
  };
}
