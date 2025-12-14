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

import { assert, assertEquals, assertExists } from "@std/assert";
import { BottEvent } from "./events.ts";
import { BottEventType } from "@bott/model";
import type { BottChannel, BottUser } from "@bott/model";

Deno.test("BottEvent - constructor initializes required properties", () => {
  const event = new BottEvent(BottEventType.MESSAGE);

  // Verify required properties are initialized
  assertEquals(event.type, BottEventType.MESSAGE);
  assertExists(event.id, "Event should have an id");
  assertExists(event.createdAt, "Event should have a createdAt timestamp");
  assert(event.createdAt instanceof Date, "createdAt should be a Date object");
  assert(event.id.length > 0, "id should not be empty");
});

Deno.test("BottEvent - constructor generates unique IDs", () => {
  const event1 = new BottEvent(BottEventType.MESSAGE);
  const event2 = new BottEvent(BottEventType.MESSAGE);

  assert(event1.id !== event2.id, "Each event should have a unique id");
});

Deno.test("BottEvent - constructor accepts detail in eventInitDict", () => {
  const detail = { content: "Hello, world!" };
  const event = new BottEvent(BottEventType.MESSAGE, { detail });

  assertEquals(event.detail, detail);
  assertEquals(event.detail.content, "Hello, world!");
});

Deno.test("BottEvent - constructor accepts optional channel", () => {
  const channel: BottChannel = {
    id: "channel-123",
    name: "general",
    space: { id: "space-1", name: "Test Space" },
  };
  const event = new BottEvent(BottEventType.MESSAGE, { channel });

  assertEquals(event.channel, channel);
  assertEquals(event.channel?.id, "channel-123");
  assertEquals(event.channel?.name, "general");
});

Deno.test("BottEvent - constructor accepts optional user", () => {
  const user: BottUser = {
    id: "user-456",
    name: "Alice",
  };
  const event = new BottEvent(BottEventType.MESSAGE, { user });

  assertEquals(event.user, user);
  assertEquals(event.user?.id, "user-456");
  assertEquals(event.user?.name, "Alice");
});

Deno.test("BottEvent - constructor accepts optional parent", () => {
  const parentEvent = new BottEvent(BottEventType.MESSAGE, {
    detail: { content: "Original message" },
  });
  const replyEvent = new BottEvent(BottEventType.REPLY, {
    detail: { content: "Reply message" },
    parent: parentEvent,
  });

  assertEquals(replyEvent.parent, parentEvent);
  assertEquals(replyEvent.parent?.type, BottEventType.MESSAGE);
});

Deno.test("BottEvent - constructor accepts optional attachments", () => {
  const parentEvent = new BottEvent(BottEventType.MESSAGE);
  const attachments = [
    {
      id: "attachment-1",
      parent: parentEvent,
      originalSource: new URL("https://example.com/image.png"),
      raw: {
        id: "raw-1",
        path: "/path/to/raw",
        file: new File([], "image.png"),
      },
      compressed: {
        id: "compressed-1",
        path: "/path/to/compressed",
        file: new File([], "image_compressed.png"),
      },
    },
  ];
  const event = new BottEvent(BottEventType.MESSAGE, { attachments });

  assertEquals(event.attachments, attachments);
  assertEquals(event.attachments?.length, 1);
  assertEquals(event.attachments?.[0].id, "attachment-1");
});

Deno.test("BottEvent - constructor without eventInitDict works", () => {
  const event = new BottEvent(BottEventType.MESSAGE);

  assertEquals(event.channel, undefined);
  assertEquals(event.parent, undefined);
  assertEquals(event.user, undefined);
  assertEquals(event.attachments, undefined);
  assertEquals(event.detail, undefined);
});

Deno.test("BottEvent - extends CustomEvent", () => {
  const event = new BottEvent(BottEventType.MESSAGE);

  assert(event instanceof CustomEvent, "BottEvent should extend CustomEvent");
  assert(event instanceof Event, "BottEvent should be an Event");
});

Deno.test("BottEvent - CustomEvent properties are accessible", () => {
  const detail = { content: "Test message" };
  const event = new BottEvent(BottEventType.MESSAGE, { detail });

  assertEquals(event.type, BottEventType.MESSAGE);
  assertEquals(event.detail, detail);
  assertEquals(event.bubbles, false); // Default CustomEvent behavior
  assertEquals(event.cancelable, false); // Default CustomEvent behavior
});

Deno.test("BottEvent - toJSON includes all properties", () => {
  const channel: BottChannel = {
    id: "channel-123",
    name: "general",
    space: { id: "space-1", name: "Test Space" },
  };
  const user: BottUser = {
    id: "user-456",
    name: "Bob",
  };
  const parentEvent = new BottEvent(BottEventType.MESSAGE);
  const detail = { content: "Test content" };
  const attachments = [
    {
      id: "attachment-1",
      parent: parentEvent,
      originalSource: new URL("https://example.com/file.pdf"),
      raw: {
        id: "raw-1",
        path: "/path/to/raw",
        file: new File([], "file.pdf"),
      },
      compressed: {
        id: "compressed-1",
        path: "/path/to/compressed",
        file: new File([], "file_compressed.pdf"),
      },
    },
  ];

  const event = new BottEvent(BottEventType.REPLY, {
    detail,
    channel,
    user,
    parent: parentEvent,
    attachments,
  });

  const json = event.toJSON();

  assertExists(json.id);
  assertEquals(json.type, BottEventType.REPLY);
  assertEquals(json.detail, detail);
  assertExists(json.createdAt);
  assertEquals(json.channel, channel);
  assertEquals(json.user, user);
  assertEquals(json.parent, parentEvent);
  assertEquals(json.attachments, attachments);
});

Deno.test("BottEvent - toJSON with minimal properties", () => {
  const event = new BottEvent(BottEventType.MESSAGE);
  const json = event.toJSON();

  assertExists(json.id);
  assertEquals(json.type, BottEventType.MESSAGE);
  assertExists(json.createdAt);
  assertEquals(json.lastProcessedAt, undefined);
  assertEquals(json.channel, undefined);
  assertEquals(json.parent, undefined);
  assertEquals(json.user, undefined);
  assertEquals(json.attachments, undefined);
});

Deno.test("BottEvent - toJSON includes lastProcessedAt when set", () => {
  const event = new BottEvent(BottEventType.MESSAGE);
  const processedTime = new Date();
  event.lastProcessedAt = processedTime;

  const json = event.toJSON();

  assertEquals(json.lastProcessedAt, processedTime);
});

Deno.test("BottEvent - toJSON result is serializable", () => {
  const event = new BottEvent(BottEventType.MESSAGE, {
    detail: { content: "Serialization test" },
  });

  const json = event.toJSON();
  const serialized = JSON.stringify(json);

  assert(serialized.length > 0, "JSON should be serializable");
  assert(
    serialized.includes(event.id),
    "Serialized JSON should include event id",
  );
  assert(
    serialized.includes(BottEventType.MESSAGE),
    "Serialized JSON should include event type",
  );
});

Deno.test("BottEvent - supports all event types", () => {
  const messageEvent = new BottEvent(BottEventType.MESSAGE);
  const replyEvent = new BottEvent(BottEventType.REPLY);
  const reactionEvent = new BottEvent(BottEventType.REACTION);
  const actionCallEvent = new BottEvent(BottEventType.ACTION_CALL);
  const actionResultEvent = new BottEvent(BottEventType.ACTION_RESULT);

  assertEquals(messageEvent.type, BottEventType.MESSAGE);
  assertEquals(replyEvent.type, BottEventType.REPLY);
  assertEquals(reactionEvent.type, BottEventType.REACTION);
  assertEquals(actionCallEvent.type, BottEventType.ACTION_CALL);
  assertEquals(actionResultEvent.type, BottEventType.ACTION_RESULT);
});

Deno.test("BottEvent - type-specific details work correctly", () => {
  const actionCallEvent = new BottEvent(BottEventType.ACTION_CALL, {
    detail: {
      name: "testAction",
      options: { param1: "value1" },
    },
  });

  assertEquals(actionCallEvent.detail.name, "testAction");
  assertEquals(actionCallEvent.detail.options.param1, "value1");
});

Deno.test("BottEvent - createdAt is close to current time", () => {
  const beforeCreation = new Date();
  const event = new BottEvent(BottEventType.MESSAGE);
  const afterCreation = new Date();

  assert(
    event.createdAt >= beforeCreation,
    "createdAt should be after or equal to before time",
  );
  assert(
    event.createdAt <= afterCreation,
    "createdAt should be before or equal to after time",
  );
});
