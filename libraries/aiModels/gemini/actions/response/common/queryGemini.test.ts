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

import { BottEventType } from "@bott/events";
import { BottEvent } from "@bott/events";
import { assertEquals } from "@std/assert/equals";
import { createMockContext, createMockUser } from "../pipeline/e2e.ts";
import {
  _formatTimestampAsRelative,
  _transformBottEventToContent,
} from "./queryGemini.ts";

Deno.test("_formatTimestampAsRelative - just now", () => {
  const now = new Date();
  const result = _formatTimestampAsRelative(now);
  assertEquals(result, "just now");
});

Deno.test("_formatTimestampAsRelative - 30 seconds ago", () => {
  const timestamp = new Date(Date.now() - 30 * 1000);
  const result = _formatTimestampAsRelative(timestamp);
  assertEquals(result, "just now");
});

Deno.test("_formatTimestampAsRelative - 1 minute ago", () => {
  const timestamp = new Date(Date.now() - 60 * 1000);
  const result = _formatTimestampAsRelative(timestamp);
  assertEquals(result, "1 minute ago");
});

Deno.test("_formatTimestampAsRelative - 5 minutes ago", () => {
  const timestamp = new Date(Date.now() - 5 * 60 * 1000);
  const result = _formatTimestampAsRelative(timestamp);
  assertEquals(result, "5 minutes ago");
});

Deno.test("_formatTimestampAsRelative - 1 hour ago", () => {
  const timestamp = new Date(Date.now() - 60 * 60 * 1000);
  const result = _formatTimestampAsRelative(timestamp);
  assertEquals(result, "1 hour ago");
});

Deno.test("_formatTimestampAsRelative - 3 hours ago", () => {
  const timestamp = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const result = _formatTimestampAsRelative(timestamp);
  assertEquals(result, "3 hours ago");
});

Deno.test("_formatTimestampAsRelative - 1 day ago", () => {
  const timestamp = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = _formatTimestampAsRelative(timestamp);
  assertEquals(result, "1 day ago");
});

Deno.test("_formatTimestampAsRelative - 7 days ago", () => {
  const timestamp = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = _formatTimestampAsRelative(timestamp);
  assertEquals(result, "7 days ago");
});

Deno.test("_formatTimestampAsRelative - ISO string format", () => {
  const timestamp = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const result = _formatTimestampAsRelative(timestamp);
  assertEquals(result, "2 hours ago");
});

Deno.test("_transformBottEventToContent - basic event", async () => {
  const context = createMockContext();
  const event = new BottEvent(BottEventType.MESSAGE, {
    user: createMockUser(),
    channel: context.action.channel!,
    detail: { content: "test" },
  });

  const result = await _transformBottEventToContent(event, context);
  assertEquals(result.role, "user");
  assertEquals(result.parts?.length, 1);
});
