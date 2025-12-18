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

import { STORAGE_DEPLOY_NONCE_LOCATION } from "@bott/constants";
import { BottEventType } from "@bott/model";
import type { BottService } from "@bott/model";
import { assert } from "@std/assert";
import { assertSpyCall, assertSpyCalls, spy, stub } from "@std/testing/mock";
import { BottEvent } from "./events.ts";
import { addEventListener } from "./listener.ts";
import { serviceRegistry } from "./registry.ts";

Deno.test("addEventListener - calls handler when nonce matches", () => {
  const handler = spy();
  const eventType = BottEventType.MESSAGE;
  const nonce = "test-nonce";

  // Set registry nonce
  serviceRegistry.nonce = nonce;

  // Mock Deno.readTextFileSync to return matching nonce
  using _readTextFileSyncStub = stub(
    Deno,
    "readTextFileSync",
    (path: string | URL) => {
      if (path === STORAGE_DEPLOY_NONCE_LOCATION) return nonce;
      throw new Deno.errors.NotFound();
    },
  );

  // Register listener
  addEventListener(eventType, handler);

  // Dispatch event
  const event = new BottEvent(eventType);
  globalThis.dispatchEvent(event);

  // Verify handler called
  assertSpyCalls(handler, 1);
  assert(handler.calls[0].args[0] instanceof BottEvent);
});

Deno.test("addEventListener - does not call handler when nonce mismatches", () => {
  const handler = spy();
  const eventType = BottEventType.MESSAGE;

  // Set registry nonce
  serviceRegistry.nonce = "registry-nonce";

  // Mock Deno.readTextFileSync to return DIFFERENT nonce
  using _readTextFileSyncStub = stub(
    Deno,
    "readTextFileSync",
    (path: string | URL) => {
      if (path === STORAGE_DEPLOY_NONCE_LOCATION) return "disk-nonce";
      throw new Deno.errors.NotFound();
    },
  );

  // Register listener
  addEventListener(eventType, handler);

  // Dispatch event
  const event = new BottEvent(eventType);
  globalThis.dispatchEvent(event);

  // Verify handler NOT called
  assertSpyCalls(handler, 0);
});

Deno.test("addEventListener - passes service to handler", () => {
  const handler = spy();
  const eventType = BottEventType.MESSAGE;
  const nonce = "test-nonce";
  const serviceId = "bot-user-1";
  const serviceMock = { user: { id: serviceId } } as BottService;

  // Setup registry
  serviceRegistry.nonce = nonce;
  serviceRegistry.services.set(serviceId, serviceMock);

  // Mock Deno.readTextFileSync
  using _readTextFileSyncStub = stub(
    Deno,
    "readTextFileSync",
    () => nonce,
  );

  addEventListener(eventType, handler);

  // Dispatch event with matching user
  const event = new BottEvent(eventType, {
    user: { id: serviceId, name: "Bot" },
  });
  globalThis.dispatchEvent(event);

  // Verify handler called with service
  assertSpyCall(handler, 0, {
    args: [event, serviceMock],
  });
});
