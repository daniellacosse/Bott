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

import { log } from "@bott/common";
import { assertEquals, assertExists } from "@std/assert";

import { BottSystemManager } from "../../manager.ts";
import { BottEventType } from "../../types.ts";
import { BottEvent } from "../create.ts";
import { getEvents } from "./get.ts";
import { eventStorageService } from "./service.ts";
import { upsertEvents } from "./upsert.ts";

const createTestManager = () => {
  const manager = new BottSystemManager({
    settings: {
      identity: "test",
      reasons: { input: [], output: [] },
    },
    services: [eventStorageService],
    actions: [],
  });

  manager.start("eventStorage");
  return manager;
};

Deno.test("Storage - upsertEvents, getEvents", async () => {
  const _tempDir = Deno.makeTempDirSync();
  createTestManager();

  // spaces
  const spaceChatWorld = {
    id: "1",
    name: "Chat World",
  };

  const channel = { id: "1", name: "main", space: spaceChatWorld };

  const nancy = { id: "1", name: "Nancy" };
  const bob = { id: "2", name: "Bob" };

  const nancyGreeting = new BottEvent(BottEventType.MESSAGE, {
    detail: { content: "Hello, world!" },
    user: nancy,
    channel,
  });
  const bobReply = new BottEvent(BottEventType.REPLY, {
    detail: { content: "Hi Nancy!" },
    user: bob,
    channel,
    parent: nancyGreeting,
  });
  const nancyReaction = new BottEvent(BottEventType.REACTION, {
    detail: { content: "👍" },
    user: nancy,
    channel,
    parent: bobReply,
  });

  log.debug("Adding events.");

  upsertEvents(nancyGreeting, bobReply, nancyReaction);

  log.debug("Getting events.");

  const [dbResult] = await getEvents(nancyReaction.id);

  log.debug("Final result:", dbResult);

  assertExists(dbResult.id);
  assertExists(dbResult.type);
  assertExists(dbResult.detail);
  assertExists(dbResult.createdAt);
  assertExists(dbResult.channel);
  assertExists(dbResult.channel.id);
  assertExists(dbResult.channel.name);
  assertExists(dbResult.channel.space);
  assertExists(dbResult.channel.space.id);
  assertExists(dbResult.channel.space.name);
  assertExists(dbResult.user);
  assertExists(dbResult.user.id);
  assertExists(dbResult.user.name);
  assertExists(dbResult.parent);
  assertExists(dbResult.parent.id);
  assertExists(dbResult.parent.type);
  assertExists(dbResult.parent.detail);
  assertExists(dbResult.parent.createdAt);
});

Deno.test("Storage - Global Listener Persistence", async () => {
  const _tempDir = Deno.makeTempDirSync();
  createTestManager();

  const event = new BottEvent(BottEventType.MESSAGE, {
    detail: { content: "Global dispatch test" },
    user: { id: "listener-test", name: "Tester" },
    channel: { id: "1", name: "main", space: { id: "1", name: "space" } },
  });

  globalThis.dispatchEvent(event);

  // Allow next tick for persistence (though it's sync in listener, better safe)
  await new Promise((r) => setTimeout(r, 10));

  const [dbResult] = await getEvents(event.id);
  assertExists(dbResult);
  assertEquals(dbResult.id, event.id);
});
