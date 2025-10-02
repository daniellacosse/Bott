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

import { assertEquals } from "jsr:@std/assert/equals";
import { BottEventType, type BottUser } from "@bott/model";
import type { GuildTextBasedChannel } from "npm:discord.js";
import { extractMentionedUsers, formatIncomingContent } from "./format.ts";

Deno.test("formatIncomingContent - empty string", () => {
  assertEquals(formatIncomingContent("", []), "");
});

Deno.test("formatIncomingContent - no mentions", () => {
  const content = "Hello, this is a test message.";
  assertEquals(formatIncomingContent(content, []), content);
});

Deno.test("formatIncomingContent - single user mention with displayName", () => {
  const users: BottUser[] = [{
    id: "123456789",
    name: "moofyboy",
    displayName: "MoofyBoy",
  }];
  const content = "Hey <@123456789>, how are you?";
  assertEquals(
    formatIncomingContent(content, users),
    "Hey @MoofyBoy, how are you?",
  );
});

Deno.test("formatIncomingContent - user mention without displayName falls back to name", () => {
  const users: BottUser[] = [{
    id: "123456789",
    name: "moofyboy",
  }];
  const content = "Hey <@123456789>, how are you?";
  assertEquals(
    formatIncomingContent(content, users),
    "Hey @moofyboy, how are you?",
  );
});

Deno.test("formatIncomingContent - nickname format", () => {
  const users: BottUser[] = [{
    id: "123456789",
    name: "moofyboy",
    displayName: "MoofyBoy",
  }];
  const content = "Hey <@!123456789>, how are you?";
  assertEquals(
    formatIncomingContent(content, users),
    "Hey @MoofyBoy, how are you?",
  );
});

Deno.test("formatIncomingContent - multiple mentions of same user", () => {
  const users: BottUser[] = [{
    id: "123456789",
    name: "moofyboy",
    displayName: "MoofyBoy",
  }];
  const content = "<@123456789> told <@123456789> about it";
  assertEquals(
    formatIncomingContent(content, users),
    "@MoofyBoy told @MoofyBoy about it",
  );
});

Deno.test("formatIncomingContent - multiple different users", () => {
  const users: BottUser[] = [
    { id: "123456789", name: "moofyboy", displayName: "MoofyBoy" },
    { id: "987654321", name: "coolcat", displayName: "CoolCat" },
  ];
  const content = "<@123456789> and <@987654321> are friends";
  assertEquals(
    formatIncomingContent(content, users),
    "@MoofyBoy and @CoolCat are friends",
  );
});

Deno.test("formatIncomingContent - special mention @everyone", () => {
  const content = "Hey @everyone, meeting starts now!";
  assertEquals(
    formatIncomingContent(content, []),
    "Hey @everyone, meeting starts now!",
  );
});

Deno.test("formatIncomingContent - unknown user keeps original format", () => {
  const content = "Hey <@999999999>, are you there?";
  assertEquals(
    formatIncomingContent(content, []),
    "Hey <@999999999>, are you there?",
  );
});

Deno.test("extractMentionedUsers - extracts user from event", () => {
  const event = {
    id: "msg1",
    type: BottEventType.MESSAGE,
    details: { content: "test" },
    timestamp: new Date(),
    user: { id: "user1", name: "Alice", displayName: "Alice Wonder" },
  };
  const users = extractMentionedUsers(event);
  assertEquals(users.length, 1);
  assertEquals(users[0].id, "user1");
  assertEquals(users[0].displayName, "Alice Wonder");
});

Deno.test("extractMentionedUsers - extracts users from parent chain", () => {
  const parentEvent = {
    id: "msg1",
    type: BottEventType.MESSAGE,
    details: { content: "parent" },
    timestamp: new Date(),
    user: { id: "user1", name: "Alice", displayName: "Alice Wonder" },
  };
  const event = {
    id: "msg2",
    type: BottEventType.REPLY,
    details: { content: "reply" },
    timestamp: new Date(),
    user: { id: "user2", name: "Bob", displayName: "Bob Builder" },
    parent: parentEvent,
  };
  const users = extractMentionedUsers(event);
  assertEquals(users.length, 2);
  assertEquals(users.some((u) => u.id === "user1"), true);
  assertEquals(users.some((u) => u.id === "user2"), true);
});

Deno.test("extractMentionedUsers - handles duplicate users", () => {
  const parentEvent = {
    id: "msg1",
    type: BottEventType.MESSAGE,
    details: { content: "parent" },
    timestamp: new Date(),
    user: { id: "user1", name: "Alice", displayName: "Alice Wonder" },
  };
  const event = {
    id: "msg2",
    type: BottEventType.REPLY,
    details: { content: "reply" },
    timestamp: new Date(),
    user: { id: "user1", name: "Alice", displayName: "Alice Wonder" },
    parent: parentEvent,
  };
  const users = extractMentionedUsers(event);
  assertEquals(users.length, 1);
  assertEquals(users[0].id, "user1");
});
