import { assertExists } from "jsr:@std/assert";

Deno.test("database smoke test", async () => {
  const tempDbFile = await Deno.makeTempFile();

  Deno.env.set("DB_PATH", tempDbFile);

  // users
  const { addUsers } = await import("./users.ts");

  const userNancy = { id: 1, name: "Nancy" };
  const userBob = { id: 2, name: "Bob" };

  addUsers(userNancy, userBob);

  // channels
  const { addChannels } = await import ("./channels.ts");

  const channelMain = { id: 1, name: "main" };
  const channelRandom = { id: 2, name: "random", description: "random channel" };

  addChannels(channelMain, channelRandom);

  // events
  const { addEvents, getEvents, EventType } = await import("./events.ts");

  const nancyGreeting = {
    id: 1,
    type: EventType.MESSAGE,
    user: userNancy,
    channel: channelMain,
    data: new TextEncoder().encode("Hello"),
    timestamp: new Date()
  };
  const bobReply = {
    id: 2,
    type: EventType.REPLY,
    user: userBob,
    channel: channelMain,
    parent: nancyGreeting,
    data: new TextEncoder().encode("Hi"),
    timestamp: new Date()
  };
  const nancyReaction = {
    id: 3,
    type: EventType.REACTION,
    user: userNancy,
    channel: channelMain,
    parent: bobReply,
    data: new TextEncoder().encode("👍"),
    timestamp: new Date()
  };

  addEvents(nancyGreeting, bobReply, nancyReaction);

  // test
  const [dbResult] = getEvents(nancyReaction.id);

  console.log(dbResult);

  assertExists(dbResult.id);
  assertExists(dbResult.type);
  assertExists(dbResult.data);
  assertExists(dbResult.timestamp);
  assertExists(dbResult.channel);
  assertExists(dbResult.channel.id);
  assertExists(dbResult.channel.name);
  assertExists(dbResult.user);
  assertExists(dbResult.user.id);
  assertExists(dbResult.user.name);
  assertExists(dbResult.parent);
  assertExists(dbResult.parent.id);
  assertExists(dbResult.parent.type);
  assertExists(dbResult.parent.data);
  assertExists(dbResult.parent.timestamp);
});