import { assertEquals } from "jsr:@std/assert";

import { initFilesystem, readData, writeData } from "./client.ts";
import { prepareHtml } from "./prepare/html.ts";

Deno.test("prepareHtml", async () => {
  initFilesystem(); // To set file size limits.

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
  const inputData = new TextEncoder().encode(htmlInput);

  const [resultData] = await prepareHtml(inputData);
  const resultMarkdown = new TextDecoder().decode(resultData);

  assertEquals(
    resultMarkdown,
    `# Test Title

_By: Test Author_

## Main Heading

This is a paragraph with **bold text** and *italic text*.

Another paragraph.

-   Item 1
-   Item 2

\`\`\`
body { color: blue; }
\`\`\``,
  );
});

Deno.test("filesystem", () => {
  const tempDir = Deno.makeTempDirSync();

  initFilesystem(tempDir);

  const data = new TextEncoder().encode("Hello, world!");
  const path = "test/hello.txt";

  writeData(data, path);

  assertEquals(readData(path), data);

  Deno.removeSync(tempDir, { recursive: true });
});
