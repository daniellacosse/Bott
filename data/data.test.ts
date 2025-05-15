import { addEvents, BottEventType, getEvents } from "./model/events.ts";

import { assertExists } from "jsr:@std/assert";
import { setSchema } from "./model/schema.ts";

Deno.test("database smoke test", async () => {
  const tempDbFile = await Deno.makeTempFile();

  Deno.env.set("DB_PATH", tempDbFile);

  setSchema();

  // spaces
  const spaceChatWorld = {
    id: "1",
    name: "Chat World",
  };

  const channelMain = { id: "1", name: "main", space: spaceChatWorld };

  const userNancy = { id: "1", name: "Nancy" };
  const userBob = { id: "2", name: "Bob" };

  const nancyGreeting = {
    id: "1",
    type: BottEventType.MESSAGE,
    user: userNancy,
    channel: channelMain,
    details: { content: "Hello" },
    timestamp: new Date(),
  };
  const bobReply = {
    id: "2",
    type: BottEventType.REPLY,
    user: userBob,
    channel: channelMain,
    parent: nancyGreeting,
    details: { content: "Hi" },
    timestamp: new Date(),
  };
  const nancyReaction = {
    id: "3",
    type: BottEventType.REACTION,
    user: userNancy,
    channel: channelMain,
    parent: bobReply,
    details: { content: "👍" },
    timestamp: new Date(),
  };

  addEvents(nancyGreeting, bobReply, nancyReaction);

  // test
  const [dbResult] = getEvents(nancyReaction.id);

  console.log("final result:", dbResult);

  assertExists(dbResult.id);
  assertExists(dbResult.type);
  assertExists(dbResult.details);
  assertExists(dbResult.timestamp);
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
  assertExists(dbResult.parent.details);
  assertExists(dbResult.parent.timestamp);
});
