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

import { APP_USER } from "@bott/common";
import { BottEvent, BottEventType } from "@bott/system";
import type { Part } from "@google/genai";
import { assert, assertEquals } from "@std/assert";
import type { EventPipelineContext } from "../../actions/response/pipeline/types.ts";
import { formatTimestampAsRelative, prepareContents } from "./prepare.ts";

Deno.test("formatTimestampAsRelative - just now", () => {
  const result = formatTimestampAsRelative(new Date().toISOString());
  assertEquals(result, "just now");
});

Deno.test("formatTimestampAsRelative - 30 seconds ago", () => {
  const date = new Date(Date.now() - 30 * 1000);
  const result = formatTimestampAsRelative(date.toISOString());
  assertEquals(result, "just now");
});

Deno.test("formatTimestampAsRelative - 1 minute ago", () => {
  const date = new Date(Date.now() - 60 * 1000);
  const result = formatTimestampAsRelative(date.toISOString());
  assertEquals(result, "1 minute ago");
});

Deno.test("formatTimestampAsRelative - 5 minutes ago", () => {
  const date = new Date(Date.now() - 5 * 60 * 1000);
  const result = formatTimestampAsRelative(date.toISOString());
  assertEquals(result, "5 minutes ago");
});

Deno.test("formatTimestampAsRelative - 1 hour ago", () => {
  const date = new Date(Date.now() - 60 * 60 * 1000);
  const result = formatTimestampAsRelative(date.toISOString());
  assertEquals(result, "1 hour ago");
});

Deno.test("formatTimestampAsRelative - 3 hours ago", () => {
  const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const result = formatTimestampAsRelative(date.toISOString());
  assertEquals(result, "3 hours ago");
});

Deno.test("formatTimestampAsRelative - 1 day ago", () => {
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = formatTimestampAsRelative(date.toISOString());
  assertEquals(result, "1 day ago");
});

Deno.test("formatTimestampAsRelative - 7 days ago", () => {
  const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = formatTimestampAsRelative(date.toISOString());
  assertEquals(result, "7 days ago");
});

Deno.test("formatTimestampAsRelative - ISO string format", () => {
  const date = new Date(Date.now() - 10 * 60 * 1000);
  const result = formatTimestampAsRelative(date.toISOString());
  assertEquals(result, "10 minutes ago");
});

Deno.test("prepareContents - basic event", async () => {
  const event = new BottEvent(BottEventType.MESSAGE, {
    detail: { content: "Hello", channel: { id: "123", name: "test" } },
    user: APP_USER,
  });
  const shallow = event.toJSON();

  // Creating context stub
  const context = {
    evaluationState: new Map(),
  } as unknown as EventPipelineContext;

  const contents = await prepareContents([shallow], context);
  assert(contents.length === 1);
  const parts = contents[0].parts;
  assert(parts?.some((p: Part) => p.text?.includes("Hello")));
  assert(
    parts?.some((p: Part) =>
      p.text?.includes("pipelineEvaluationMetadata") === false
    ),
  ); // No metadata added
});

Deno.test("prepareContents - with metadata", async () => {
  const event = new BottEvent(BottEventType.MESSAGE, {
    detail: { content: "Hello", channel: { id: "123", name: "test" } },
    user: APP_USER,
  });
  const shallow = event.toJSON();

  const context = {
    evaluationState: new Map(),
  } as unknown as EventPipelineContext;

  // Use ID key
  context.evaluationState.set(shallow.id, {
    ratings: { relevance: 5 },
  });

  const contents = await prepareContents([shallow], context);
  const parts = contents[0].parts;
  assert(parts?.some((p: Part) => p.text?.includes("relevance")));
});
