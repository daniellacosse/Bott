import { assertEquals } from "jsr:@std/assert";

Deno.test("database smoke test", async () => {
  const tempDbFile = await Deno.makeTempFile();

  Deno.env.set("DB_PATH", tempDbFile);

  // users
  const { addUsers } = await import("./users.ts");

  const userNancy = { id: 1, name: "Nancy" };
  const userBob = { id: 2, name: "Bob" };

  await addUsers(
    userNancy,
    userBob,
  );

  // channels
  const { addChannels } = await import ("./channels.ts");

  const channelMain = { id: 1, name: "main" };
  const channelRandom = { id: 2, name: "random", description: "random channel" };

  await addChannels(
    channelMain,
    channelRandom
  );

  // events
  const { addEvents, getEvents, EventType } = await import("./events.ts");

  const nancyGreeting = {
    id: 1,
    type: EventType.MESSAGE,
    user: userNancy,
    channel: channelMain,
    data: new Blob(),
    timestamp: new Date()
  };
  const bobReply = {
    id: 2,
    type: EventType.REPLY,
    user: userBob,
    channel: channelMain,
    parent: nancyGreeting,
    data: new Blob(),
    timestamp: new Date()
  };
  const nancyReaction = {
    id: 3,
    type: EventType.REACTION,
    user: userNancy,
    channel: channelMain,
    data: new Blob(),
    timestamp: new Date()
  };

  await addEvents(
    nancyGreeting,
    bobReply,
    nancyReaction
  );

  // test
  assertEquals(await getEvents(nancyReaction.id), [nancyReaction]);
});