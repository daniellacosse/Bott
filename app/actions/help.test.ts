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

import { assert, assertEquals, assertExists } from "@std/assert";
import { help } from "./help.ts";
import { BottEventType } from "@bott/model";

Deno.test("help - returns ACTION_RESULT event", async () => {
  const result = await help();

  assertEquals(result.type, BottEventType.ACTION_RESULT);
});

Deno.test("help - includes embeds in detail", async () => {
  const result = await help();

  assertExists(result.detail);
  assertExists(result.detail.embeds);
  assert(Array.isArray(result.detail.embeds));
  assertEquals(result.detail.embeds.length, 1);
});

Deno.test("help - embed includes version in footer", async () => {
  const result = await help();
  const embed = result.detail.embeds[0];

  assertExists(embed.data.footer);
  assertExists(embed.data.footer.text);
  assert(
    embed.data.footer.text.includes("v"),
    "Footer should include version prefix",
  );
  assert(
    embed.data.footer.text.includes("0.0.0-alpha") ||
      embed.data.footer.text.includes("unknown"),
    "Footer should include version number",
  );
});

Deno.test("help - embed has correct title", async () => {
  const result = await help();
  const embed = result.detail.embeds[0];

  assertEquals(embed.data.title, "Help Menu");
});

Deno.test("help - embed has required fields", async () => {
  const result = await help();
  const embed = result.detail.embeds[0];

  assertExists(embed.data.fields);
  assert(Array.isArray(embed.data.fields));
  assert(
    embed.data.fields.length >= 3,
    "Should have at least 3 fields (About, Limitations, /help)",
  );

  const fieldNames = embed.data.fields.map((f) => f.name);
  assert(fieldNames.includes("About"), "Should have About field");
  assert(fieldNames.includes("Limitations"), "Should have Limitations field");
  assert(fieldNames.includes("/help"), "Should have /help field");
});

Deno.test("help - has description property", () => {
  assertExists(help.description);
  assertEquals(help.description, "Get help with @Bott.");
});
