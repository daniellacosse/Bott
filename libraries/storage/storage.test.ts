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

import { assertEquals, assertExists } from "jsr:@std/assert";

import { BottEventType } from "@bott/model";

import { addEventData } from "./data/events/add.ts";
import { getEvents } from "./data/events/get.ts";
import { prepareHtmlAsMarkdown } from "./files/prepare/html.ts";
import { startStorage } from "./start.ts";

Deno.test("Storage - addEventsData, getEvents", async () => {
  const tempDir = Deno.makeTempDirSync();

  startStorage(tempDir);

  // spaces
  const spaceChatWorld = {
    id: "1",
    name: "Chat World",
  };

  const channelMain = { id: "1", name: "main", space: spaceChatWorld };

  const userNancy = { id: "1", name: "Nancy" };
  const userBob = { id: "2", name: "Bob" };

  const nancyGreeting = {
    id: "1",
    type: BottEventType.MESSAGE,
    user: userNancy,
    channel: channelMain,
    details: { content: "Hello" },
    timestamp: new Date(),
  };
  const bobReply = {
    id: "2",
    type: BottEventType.REPLY,
    user: userBob,
    channel: channelMain,
    parent: nancyGreeting,
    details: { content: "Hi" },
    timestamp: new Date(),
  };
  const nancyReaction = {
    id: "3",
    type: BottEventType.REACTION,
    user: userNancy,
    channel: channelMain,
    parent: bobReply,
    details: { content: "👍" },
    timestamp: new Date(),
  };

  console.debug("[DEBUG] Adding events.");

  addEventData(nancyGreeting, bobReply, nancyReaction);

  console.debug("[DEBUG] Getting events.");

  const [dbResult] = await getEvents(nancyReaction.id);

  console.debug("[DEBUG] Final result:", dbResult);

  assertExists(dbResult.id);
  assertExists(dbResult.type);
  assertExists(dbResult.details);
  assertExists(dbResult.timestamp);
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
  assertExists(dbResult.parent.details);
  assertExists(dbResult.parent.timestamp);
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
  startStorage(tempDir);

  const inputData = new TextEncoder().encode(htmlInput);

  const { data } = await prepareHtmlAsMarkdown(inputData);
  const resultMarkdown = new TextDecoder().decode(data);

  assertEquals(
    resultMarkdown,
    expectedMarkdownOutput,
  );
});
