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

import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";

import { BottEventType } from "@bott/model";
import { BottEvent } from "@bott/service";
import { log } from "@bott/log";

import { STORAGE_DEPLOY_NONCE_PATH } from "@bott/constants";
import { serviceRegistry } from "@bott/service";
import { addEvents } from "./data/events/add.ts";
import { getEvents } from "./data/events/get.ts";
import { prepareHtmlAsMarkdown } from "./prepare/html.ts";
import { startStorageService } from "./service.ts";

Deno.test("Storage - addEventsData, getEvents", async () => {
  const tempDir = Deno.makeTempDirSync();

  await startStorageService({ root: tempDir });

  // spaces
  const spaceChatWorld = {
    id: "1",
    name: "Chat World",
  };

  const channel = { id: "1", name: "main", space: spaceChatWorld };

  const nancy = { id: "1", name: "Nancy" };
  const bob = { id: "2", name: "Bob" };

  const nancyGreeting = new BottEvent(BottEventType.MESSAGE, {
    detail: { content: "Hello, world!" },
    user: nancy,
    channel,
  });
  const bobReply = new BottEvent(BottEventType.REPLY, {
    detail: { content: "Hi Nancy!" },
    user: bob,
    channel,
    parent: nancyGreeting,
  });
  const nancyReaction = new BottEvent(BottEventType.REACTION, {
    detail: { content: "👍" },
    user: nancy,
    channel,
    parent: bobReply,
  });

  log.debug("Adding events.");

  addEvents(nancyGreeting, bobReply, nancyReaction);

  log.debug("Getting events.");

  const [dbResult] = await getEvents(nancyReaction.id);

  log.debug("Final result:", dbResult);

  assertExists(dbResult.id);
  assertExists(dbResult.type);
  assertExists(dbResult.detail);
  assertExists(dbResult.createdAt);
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
  assertExists(dbResult.parent.detail);
  assertExists(dbResult.parent.createdAt);
});

const htmlInput = `
  <html>
    <head>
      <title>Test Title</title>
      <link rel="canonical" href="https://example.com/" />
      <meta name="description" content="Test Description.">
      <meta name="author" content="Test Author">
    </head>
    <body>
      <article>
        <h1>Main Heading</h1>
        <p>This is a paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
        <p>Another paragraph.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
        <pre><code class="language-css">body { color: blue; }</code></pre>
      </article>
    </body>
  </html>`;

const expectedMarkdownOutput = `# Test Title

_By: Test Author_

## Main Heading

This is a paragraph with **bold text** and *italic text*.

Another paragraph.

-   Item 1
-   Item 2

\`\`\`
body { color: blue; }
\`\`\``;

Deno.test("Storage - prepareHtml", async () => {
  const tempDir = Deno.makeTempDirSync();
  await startStorageService({ root: tempDir });

  const inputData = new TextEncoder().encode(htmlInput);
  const result = await prepareHtmlAsMarkdown(
    new File([inputData], "test.html"),
    "1",
  );
  const data = new Uint8Array(await result.arrayBuffer());
  const markdownContent = new TextDecoder().decode(data);

  assertEquals(
    markdownContent,
    expectedMarkdownOutput,
  );
});

Deno.test("Storage - Global Listener Persistence", async () => {
  const tempDir = Deno.makeTempDirSync();
  await startStorageService({ root: tempDir });

  // Setup nonce to ensure listener fires
  const nonce = "test-nonce";
  serviceRegistry.nonce = nonce;

  using _readStub = stub(
    Deno,
    "readTextFileSync",
    (path: string | URL) => {
      if (path === STORAGE_DEPLOY_NONCE_PATH) return nonce;
      throw new Deno.errors.NotFound();
    },
  );

  const event = new BottEvent(BottEventType.MESSAGE, {
    detail: { content: "Global dispatch test" },
    user: { id: "listener-test", name: "Tester" },
    channel: { id: "1", name: "main", space: { id: "1", name: "space" } },
  });

  globalThis.dispatchEvent(event);

  // Allow next tick for persistence (though it's sync in listener, better safe)
  await new Promise((r) => setTimeout(r, 10));

  const [dbResult] = await getEvents(event.id);
  assertExists(dbResult);
  assertEquals(dbResult.id, event.id);
});
