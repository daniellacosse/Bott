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
import { prepareHtmlAsMarkdown } from "./html.ts";

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