
import { createAction } from "@bott/actions";
import { STORAGE_DEPLOY_NONCE_LOCATION } from "@bott/constants";
import { BottEventType } from "@bott/model";
import { BottEvent, serviceRegistry } from "@bott/service";
import { addEvents, startEventStorageService } from "@bott/storage";
import { assert } from "@std/assert";
import { stub } from "@std/testing/mock";
import { startActionService } from "./service.ts";

Deno.test("Action Service - Rate Limiting", async () => {
  const tempDir = Deno.makeTempDirSync();
  await startEventStorageService({ root: tempDir });

  const limitedAction = createAction(
    () => Promise.resolve(),
    {
      name: "limited-action",
      instructions: "Run me",
      limitPerMonth: 2,
    }
  );

  await startActionService({
    actions: { "limited-action": limitedAction },
  });

  // Seed the database with 2 ACTION_START events for this action
  // effectively using up the quota
  const seedEvent1 = new BottEvent(BottEventType.ACTION_START, {
    detail: { name: "limited-action", id: "1" },
  });
  const seedEvent2 = new BottEvent(BottEventType.ACTION_START, {
    detail: { name: "limited-action", id: "2" },
  });

  await addEvents(seedEvent1, seedEvent2);

  // Setup nonce to ensure listener fires
  const nonce = "test-nonce";
  serviceRegistry.nonce = nonce;

  using _readStub = stub(
    Deno,
    "readTextFileSync",
    (path: string | URL) => {
      if (path === STORAGE_DEPLOY_NONCE_LOCATION) return nonce;
      throw new Deno.errors.NotFound();
    },
  );

  // Now try to call the action again
  const callEventId = crypto.randomUUID();
  const callEvent = new BottEvent(BottEventType.ACTION_CALL, {
    detail: {
      id: callEventId,
      name: "limited-action",
      parameters: [],
    },
  });

  // We need to listen for the ACTION_ERROR event
  const errorPromise = new Promise<void>((resolve, reject) => {
    const handler = (event: Event) => {
      const bottEvent = event as BottEvent;
      if (
        bottEvent.type === BottEventType.ACTION_ERROR &&
        bottEvent.detail.id === callEventId
      ) {
        try {
          assert(
            (bottEvent.detail.error as Error).message.includes("Rate limit exceeded"),
            "Error message should mention rate limit exceeded"
          );
          resolve();
        } catch (e) {
          reject(e);
        } finally {
          globalThis.removeEventListener(BottEventType.ACTION_ERROR, handler);
        }
      }
    };
    globalThis.addEventListener(BottEventType.ACTION_ERROR, handler);
  });

  globalThis.dispatchEvent(callEvent);

  await errorPromise;
});
