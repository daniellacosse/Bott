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

import { assertEquals } from "@std/assert";
import { describe, it, afterEach } from "@std/testing/bdd";
import { stub, restore, spy, assertSpyCall } from "@std/testing/mock";
import { loadEnv, updateEnv } from "./env.ts";
import * as gcloud from "./gcloud.ts";

describe("env.ts", () => {
  afterEach(() => {
    restore();
  });

  it("loadEnv should load variables into Deno.env", async () => {
    stub(Deno, "readTextFile", () => Promise.resolve("FOO: bar\nBAZ: qux"));
    const envSpy = spy(Deno.env, "set");

    await loadEnv("test");

    assertSpyCall(envSpy, 0, { args: ["FOO", "bar"] });
    assertSpyCall(envSpy, 1, { args: ["BAZ", "qux"] });
  });

  it("updateEnv should read, update, write, and set env", async () => {
    const originalYaml = "EXISTING: old\nOTHER: keep";
    stub(Deno, "readTextFile", () => Promise.resolve(originalYaml));
    const writeStub = stub(Deno, "writeTextFile", () => Promise.resolve());
    const envSpy = spy(Deno.env, "set");

    await updateEnv("test", { EXISTING: "new", NEW: "val" });

    assertSpyCall(envSpy, 0, { args: ["EXISTING", "new"] });
    assertSpyCall(envSpy, 1, { args: ["NEW", "val"] });

    const expectedYaml = "EXISTING: new\nOTHER: keep\nNEW: val\n";
    assertSpyCall(writeStub, 0, {
      args: [".env.test.yml", expectedYaml],
    });
  });
});

describe("gcloud.ts", () => {
  it("auth.check returns true on success, false on failure", async () => {
    const successClient = new gcloud.GCloudClient(() => Promise.resolve("active"));
    assertEquals(await successClient.auth.check(), true);

    const failClient = new gcloud.GCloudClient(() => Promise.reject("error"));
    assertEquals(await failClient.auth.check(), false);
  });

  it("auth.ensure calls login if check fails", async () => {
    const executed: string[][] = [];
    const mockExecutor = (args: string[]) => {
      executed.push(args);
      // First call (check) fails, second call (login) succeeds
      if (args[1] === "list") return Promise.reject("error");
      return Promise.resolve("logged in");
    };

    const client = new gcloud.GCloudClient(mockExecutor);
    await client.auth.ensure();

    assertEquals(executed.length, 2);
    assertEquals(executed[0], ["auth", "list"]);
    assertEquals(executed[1], ["auth", "login"]);
  });

  it("project.ensure tries set -> describe -> create", async () => {
    const executed: string[][] = [];
    const mockExecutor = (args: string[]) => {
      executed.push(args);
      // Fail set and describe, succeed on create
      if (args[1] === "set" || args[1] === "describe") {
        return Promise.reject("error");
      }
      return Promise.resolve("created");
    };

    const client = new gcloud.GCloudClient(mockExecutor);
    await client.project.ensure("new-project");

    assertEquals(executed.length, 3);
    assertEquals(executed[0], ["config", "set", "project", "new-project"]);
    assertEquals(executed[1], ["projects", "describe", "new-project"]);
    assertEquals(executed[2], ["projects", "create", "new-project"]);
  });
});
