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
import { afterEach, describe, it } from "@std/testing/bdd";
import { assertSpyCall, restore, spy, stub } from "@std/testing/mock";
import { updateEnv } from "./env.ts";
import * as gcloud from "./gcloud.ts";

describe("env.ts", () => {
  afterEach(() => {
    restore();
  });

  it("updateEnv should read, update, write, and set env", async () => {
    const original = "EXISTING=old\nOTHER=keep";
    stub(Deno, "readTextFile", () => Promise.resolve(original));
    const writeStub = stub(Deno, "writeTextFile", () => Promise.resolve());
    const envSpy = spy(Deno.env, "set");

    await updateEnv("test", { EXISTING: "new", NEW: "val" });

    assertSpyCall(envSpy, 0, { args: ["EXISTING", "new"] });
    assertSpyCall(envSpy, 1, { args: ["NEW", "val"] });

    const expected = "EXISTING=new\nOTHER=keep\nNEW=val";
    assertSpyCall(writeStub, 0, {
      args: [".env.test", expected],
    });
  });
});

describe("gcloud.ts", () => {
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
