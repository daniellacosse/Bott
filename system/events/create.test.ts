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

import { assert, assertEquals } from "@std/assert";
import { type Stub, stub } from "@std/testing/mock";

import { BottEventAttachmentType, BottEventType, type ShallowBottEvent } from "../types.ts";
import { BottEvent } from "./create.ts";

const MOCK_USER = {
  id: "user-123",
  name: "Test User",
  username: "testuser",
  discriminator: "1234",
};

const MOCK_CHANNEL = {
  id: "channel-123",
  name: "general",
  description: "General channel",
  type: 0,
  space: {
    id: "space-123",
    name: "Test Space",
    description: "Test Space Description",
  },
};

const MOCK_FILE_CONTENT = new Uint8Array([1, 2, 3, 4]);

Deno.test("BottEvent Serialization Tests", async (t) => {
  let readFileStub: Stub | undefined;

  await t.step("setup", () => {
    readFileStub = stub(
      Deno,
      "readFile",
      () => Promise.resolve(MOCK_FILE_CONTENT),
    );
  });

  await t.step("toJSON: strictly serializes simple message event", () => {
    const event = new BottEvent(BottEventType.MESSAGE, {
      detail: { content: "Hello World" },
      user: MOCK_USER,
      channel: MOCK_CHANNEL,
    });

    const json = event.toJSON();

    assertEquals(json.type, BottEventType.MESSAGE);
    assertEquals(json.detail.content, "Hello World");
    assertEquals(json.user.id, MOCK_USER.id);
    assertEquals(json.channel?.id, MOCK_CHANNEL.id);
    // Ensure no circular references in the resulting object (JSON stringify should work)
    assert(JSON.stringify(json).length > 0);
  });

  await t.step("toJSON: serializes event with parent", () => {
    const parentEvent = new BottEvent(BottEventType.MESSAGE, {
      id: "parent-1",
      detail: { content: "Parent" },
      user: MOCK_USER,
    });

    const childEvent = new BottEvent(BottEventType.REPLY, {
      detail: { content: "Child" },
      user: MOCK_USER,
      parent: parentEvent,
    });

    const json = childEvent.toJSON();

    assertEquals(json.parent?.id, parentEvent.id);
    assertEquals(json.parent?.detail.content, "Parent");
    assert(JSON.stringify(json).length > 0);
  });

  await t.step("toJSON: serializes ACTION_CALL with parameters", () => {
    const event = new BottEvent(BottEventType.ACTION_CALL, {
      detail: {
        name: "testAction",
        parameters: {
          param1: "value1",
          param2: 123,
          fileParam: new File(["content"], "test.txt", { type: "text/plain" }),
        },
      },
      user: MOCK_USER,
    });

    const json = event.toJSON();

    assertEquals(json.type, BottEventType.ACTION_CALL);

    const detail = json.detail as {
      name: string;
      parameters: Record<string, unknown>;
    };

    assertEquals(detail.name, "testAction");
    assertEquals(detail.parameters.param1, "value1");
    // File should be serialized to metadata
    const fileParam = detail.parameters.fileParam as {
      name: string;
      size: number;
      type: string;
    };
    assertEquals(fileParam.name, "test.txt");
    assertEquals(fileParam.type, "text/plain");

    assert(JSON.stringify(json).length > 0);
  });

  await t.step("toJSON: handles ACTION_CALL with missing parameters", () => {
    const event = new BottEvent(BottEventType.ACTION_CALL, {
      detail: {
        name: "testAction",
        parameters: undefined,
      },
      user: MOCK_USER,
    });

    const json = event.toJSON();
    const detail = json.detail as { parameters: Record<string, unknown> };
    assertEquals(detail.parameters, {});
  });

  await t.step("toJSON: serializes event with attachments", () => {
    const event = new BottEvent(BottEventType.MESSAGE, {
      detail: { content: "With Attachment" },
      user: MOCK_USER,
    });

    event.attachments = [{
      id: "att-1",
      type: BottEventAttachmentType.TXT,
      parent: event,
      originalSource: new URL("https://example.com/file.txt"),
      raw: {
        id: "raw-1",
        path: "/tmp/raw.txt",
        file: new File(["raw"], "raw.txt", { type: "text/plain" }),
      },
      compressed: {
        id: "comp-1",
        path: "/tmp/comp.txt",
        file: new File(["comp"], "comp.txt", { type: "text/plain" }),
      },
    }];

    const json = event.toJSON();

    assertEquals(json.attachments?.length, 1);
    assertEquals(json.attachments?.[0].id, "att-1");
    // Ensure parent reference is NOT included in attachment JSON to avoid cycle
    assert(!("parent" in (json.attachments?.[0] || {})));
    assert(JSON.stringify(json).length > 0);
  });

  await t.step("fromShallow: restores simple message event", async () => {
    const shallow: ShallowBottEvent = {
      id: "evt-1",
      type: BottEventType.MESSAGE,
      createdAt: new Date().toISOString(),
      detail: { content: "Restored" },
      user: { id: MOCK_USER.id, name: MOCK_USER.name },
    };

    const event = await BottEvent.fromShallow(shallow);

    assertEquals(event.id, "evt-1");
    assertEquals(event.type, BottEventType.MESSAGE);
    assertEquals(event.detail.content, "Restored");
    assertEquals(event.user.id, MOCK_USER.id);
  });

  await t.step("fromShallow: restores event with parent", async () => {
    const shallow: ShallowBottEvent = {
      id: "child-1",
      type: BottEventType.REPLY,
      createdAt: new Date().toISOString(),
      detail: { content: "Child" },
      user: { id: MOCK_USER.id, name: MOCK_USER.name },
      parent: {
        id: "parent-1",
        type: BottEventType.MESSAGE,
        createdAt: new Date().toISOString(),
        detail: { content: "Parent" },
        user: { id: MOCK_USER.id, name: MOCK_USER.name },
      },
    };

    const event = await BottEvent.fromShallow(shallow);

    assert(event.parent instanceof BottEvent);
    assertEquals(event.parent.id, "parent-1");
    assertEquals(event.parent.detail.content, "Parent");
  });

  await t.step("fromShallow: restores event with attachments", async () => {
    const shallow: ShallowBottEvent = {
      id: "evt-att",
      type: BottEventType.MESSAGE,
      createdAt: new Date().toISOString(),
      detail: { content: "With Attachment" },
      user: { id: MOCK_USER.id, name: MOCK_USER.name },
      attachments: [{
        id: "att-1",
        type: BottEventAttachmentType.TXT,
        originalSource: "https://example.com/file.txt",
        raw: {
          id: "raw-1",
          path: "/tmp/raw.txt",
          file: { name: "raw.txt", size: 100, type: "text/plain" },
        },
        compressed: {
          id: "comp-1",
          path: "/tmp/comp.txt",
          file: { name: "comp.txt", size: 50, type: "text/plain" },
        },
      }],
    };

    const event = await BottEvent.fromShallow(shallow);

    assertEquals(event.attachments?.length, 1);
    const att = event.attachments![0];
    assertEquals(att.id, "att-1");
    assertEquals(att.parent, event); // Circular reference restored in object model
    assertEquals(att.raw.file.name, "raw.txt");
    // Ensure readFile was called
    // Since we mocked readFile, the file content should match our mock
    const text = await att.raw.file.text();
    assertEquals(text.length, MOCK_FILE_CONTENT.length);
  });

  await t.step("Round trip: toJSON -> fromShallow", async () => {
    const original = new BottEvent(BottEventType.MESSAGE, {
      detail: { content: "Round Trip" },
      user: MOCK_USER,
      channel: MOCK_CHANNEL,
    });

    // Add attachment to round trip
    original.attachments = [{
      id: "att-rt",
      type: BottEventAttachmentType.TXT,
      parent: original,
      originalSource: new URL("https://example.com/rt.txt"),
      raw: {
        id: "raw-rt",
        path: "/tmp/rt.txt",
        file: new File(["rt"], "rt.txt", { type: "text/plain" }),
      },
      compressed: {
        id: "comp-rt",
        path: "/tmp/crt.txt",
        file: new File(["crt"], "crt.txt", { type: "text/plain" }),
      },
    }];

    const shallow = original.toJSON();
    const restored = await BottEvent.fromShallow(shallow);

    assertEquals(restored.id, original.id);
    assertEquals(restored.detail, original.detail);
    assertEquals(restored.user.id, original.user.id);
    assertEquals(restored.channel?.id, original.channel?.id);
    assertEquals(restored.attachments?.length, 1);
    assertEquals(restored.attachments![0].id, "att-rt");

    // Test that the restored object handles circular reference safely when going back to JSON
    // verification that restored.attachment.parent is set correctly
    assertEquals(restored.attachments![0].parent, restored);

    // And that toJSON on restored event doesn't crash
    const shallow2 = restored.toJSON();
    assert(JSON.stringify(shallow2).length > 0);
  });

  await t.step("cleanup", () => {
    readFileStub?.restore();
  });
});
