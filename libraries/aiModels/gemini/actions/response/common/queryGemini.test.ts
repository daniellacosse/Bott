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
import { BottServicesManager } from "@bott/services";
import { upsertPersona, eventStorageService } from "@bott/storage";
import { assertEquals } from "@std/assert/equals";
import { createMockContext, createMockUser } from "../pipeline/e2e.ts";
import {
  _formatTimestampAsRelative,
  _transformBottEventToContent,
  _transformMentionsToHandles,
} from "./queryGemini.ts";
import { _transformHandlesToMentions } from "./events.ts";

const createTestManager = () => {
  const manager = new BottServicesManager({
    identity: "test",
    reasons: { input: [], output: [] },
  });
  manager.register(eventStorageService);
  manager.start("eventStorage");
  return manager;
};

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

Deno.test("_transformMentionsToHandles - transforms persona mentions", async () => {
  const _tempDir = Deno.makeTempDirSync();
  createTestManager();

  const space = { id: "space123", name: "Test Space" };
  const channel = { id: "channel123", name: "general", space };

  // Create personas
  upsertPersona({
    id: "persona1",
    handle: "john_doe",
    displayName: "John Doe",
    space,
  });

  upsertPersona({
    id: "persona2",
    handle: "alice_smith",
    displayName: "Alice Smith",
    space,
  });

  const event = new BottEvent(BottEventType.MESSAGE, {
    user: createMockUser(),
    channel,
    detail: { content: "Hello @<persona1>, can you help @<persona2>?" },
  });

  const result = await _transformMentionsToHandles(
    "Hello @<persona1>, can you help @<persona2>?",
    event,
  );

  assertEquals(result, "Hello @john_doe, can you help @alice_smith?");
});

Deno.test("_transformMentionsToHandles - no mentions", async () => {
  const event = new BottEvent(BottEventType.MESSAGE, {
    user: createMockUser(),
    channel: {
      id: "channel123",
      name: "general",
      space: { id: "space123", name: "Test Space" },
    },
    detail: { content: "Hello world" },
  });

  const result = await _transformMentionsToHandles("Hello world", event);

  assertEquals(result, "Hello world");
});

Deno.test("_transformHandlesToMentions - transforms handles to persona IDs", async () => {
  const _tempDir = Deno.makeTempDirSync();
  createTestManager();

  const space = { id: "space456", name: "Test Space 2" };

  // Create personas
  upsertPersona({
    id: "persona3",
    handle: "bob_jones",
    space,
  });

  upsertPersona({
    id: "persona4",
    handle: "carol_white",
    space,
  });

  const result = await _transformHandlesToMentions(
    "Hey @bob_jones and @carol_white, how are you?",
    space.id,
  );

  assertEquals(
    result,
    "Hey @<persona3> and @<persona4>, how are you?",
  );
});

Deno.test("_transformHandlesToMentions - no handles", async () => {
  const _tempDir = Deno.makeTempDirSync();
  createTestManager();

  const result = await _transformHandlesToMentions(
    "Hello world",
    "space789",
  );

  assertEquals(result, "Hello world");
});

Deno.test("_transformHandlesToMentions - non-existent handles unchanged", async () => {
  const _tempDir = Deno.makeTempDirSync();
  createTestManager();

  const space = { id: "space999", name: "Test Space 3" };

  upsertPersona({
    id: "persona5",
    handle: "existing_user",
    space,
  });

  const result = await _transformHandlesToMentions(
    "Hello @existing_user and @nonexistent_user",
    space.id,
  );

  assertEquals(result, "Hello @<persona5> and @nonexistent_user");
});
