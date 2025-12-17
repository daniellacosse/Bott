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

import { assert, assertEquals, assertThrows } from "@std/assert";
import { BottServiceRegistry } from "./registry.ts";
import type { BottService } from "@bott/model";

Deno.test("BottServiceRegistry - register adds service", () => {
  const registry = new BottServiceRegistry();
  const service = { user: { id: "service-1" } } as BottService;

  registry.register(service);

  assertEquals(registry.get("service-1"), service);
});

Deno.test("BottServiceRegistry - register throws on duplicate", () => {
  const registry = new BottServiceRegistry();
  const service = { user: { id: "service-1" } } as BottService;

  registry.register(service);

  assertThrows(
    () => registry.register(service),
    Error,
    'Service "service-1" is already registered.',
  );
});

Deno.test("BottServiceRegistry - get returns undefined for non-existent service", () => {
  const registry = new BottServiceRegistry();
  assertEquals(registry.get("non-existent"), undefined);
});

Deno.test("BottServiceRegistry - singleton instance exists", async () => {
  const { serviceRegistry } = await import("./registry.ts");
  assert(
    serviceRegistry instanceof BottServiceRegistry,
    "serviceRegistry should be an instance of BottServiceRegistry",
  );
});
