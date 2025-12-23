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

import { BottServicesManager } from "@bott/services";
import { assertEquals, assertExists } from "@std/assert";

import { eventStorageService } from "./database/events/service.ts";
import { getPersona } from "./database/personas/get.ts";
import { upsertPersona } from "./database/personas/upsert.ts";

const createTestManager = () => {
  const manager = new BottServicesManager({
    identity: "test",
    reasons: { input: [], output: [] },
  });
  manager.register(eventStorageService);
  manager.start("eventStorage");
  return manager;
};

Deno.test("Persona - upsert and get", async () => {
  const _tempDir = Deno.makeTempDirSync();
  createTestManager();

  const space = {
    id: "space123",
    name: "Test Space",
  };

  const user = {
    id: "user456",
    name: "John Doe",
  };

  const persona = {
    id: "persona789",
    handle: "john_doe",
    displayName: "Johnny",
    space,
    user,
  };

  // Insert persona
  upsertPersona(persona);

  // Retrieve persona
  const retrievedPersona = await getPersona(persona.id, space);

  assertExists(retrievedPersona);
  assertEquals(retrievedPersona.id, persona.id);
  assertEquals(retrievedPersona.handle, persona.handle);
  assertEquals(retrievedPersona.displayName, persona.displayName);
  assertEquals(retrievedPersona.space.id, space.id);
  assertExists(retrievedPersona.user);
  assertEquals(retrievedPersona.user?.id, user.id);
  assertEquals(retrievedPersona.user?.name, user.name);
});

Deno.test("Persona - update existing", async () => {
  const _tempDir = Deno.makeTempDirSync();
  createTestManager();

  const space = {
    id: "space456",
    name: "Test Space 2",
  };

  const persona = {
    id: "persona999",
    handle: "alice_smith",
    displayName: "Alice",
    space,
  };

  // Insert persona without user
  upsertPersona(persona);

  // Update with user
  const updatedPersona = {
    ...persona,
    displayName: "Alice S.",
    user: {
      id: "user789",
      name: "Alice Smith",
    },
  };

  upsertPersona(updatedPersona);

  // Retrieve updated persona
  const retrievedPersona = await getPersona(persona.id, space);

  assertExists(retrievedPersona);
  assertEquals(retrievedPersona.displayName, "Alice S.");
  assertExists(retrievedPersona.user);
  assertEquals(retrievedPersona.user?.id, "user789");
  assertEquals(retrievedPersona.user?.name, "Alice Smith");
});

Deno.test("Persona - get non-existent", async () => {
  const _tempDir = Deno.makeTempDirSync();
  createTestManager();

  const space = {
    id: "space789",
    name: "Test Space 3",
  };

  const retrievedPersona = await getPersona("nonexistent", space);

  assertEquals(retrievedPersona, undefined);
});
