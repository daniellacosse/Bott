import { assertEquals } from "jsr:@std/assert/equals";
import { getMarkdownLinks } from "./markdown.ts";

Deno.test("getMarkdownLinks - empty string", () => {
  assertEquals(getMarkdownLinks(""), []);
});

Deno.test("getMarkdownLinks - no links", () => {
  assertEquals(getMarkdownLinks("This is a simple text."), []);
});

Deno.test("getMarkdownLinks - basic markdown link", () => {
  assertEquals(getMarkdownLinks("[Google](https://google.com)"), [
    "https://google.com",
  ]);
});

Deno.test("getMarkdownLinks - basic markdown image", () => {
  assertEquals(getMarkdownLinks("![Alt text](https://example.com/image.png)"), [
    "https://example.com/image.png",
  ]);
});

Deno.test("getMarkdownLinks - plaintext http URL", () => {
  assertEquals(getMarkdownLinks("Check http://example.com"), [
    "http://example.com",
  ]);
});

Deno.test("getMarkdownLinks - plaintext https URL", () => {
  assertEquals(getMarkdownLinks("Secure site: https://secure.example.com"), [
    "https://secure.example.com",
  ]);
});

Deno.test("getMarkdownLinks - plaintext www URL", () => {
  assertEquals(getMarkdownLinks("Visit www.example.org for more info"), [
    "www.example.org",
  ]);
});

Deno.test("getMarkdownLinks - URL in inline code", () => {
  assertEquals(getMarkdownLinks("Link in code: `https://code.example.com`"), [
    "https://code.example.com",
  ]);
});

Deno.test("getMarkdownLinks - URL in fenced code block", () => {
  const markdown = `
Some text
\`\`\`
https://fenced.example.com
\`\`\`
More text
  `;
  assertEquals(getMarkdownLinks(markdown), ["https://fenced.example.com"]);
});

Deno.test("getMarkdownLinks - duplicate URLs", () => {
  const markdown = "https://example.com and example again https://example.com";
  assertEquals(getMarkdownLinks(markdown), ["https://example.com"]);
});

Deno.test("getMarkdownLinks - URL with query parameters and fragment", () => {
  assertEquals(
    getMarkdownLinks("https://example.com/path?query=123#fragment"),
    ["https://example.com/path?query=123#fragment"],
  );
});

Deno.test("getMarkdownLinks - URL ending with a parenthesis (should be cleaned)", () => {
  assertEquals(
    getMarkdownLinks("Check (https://example.com/page)"),
    ["https://example.com/page"],
  );
  assertEquals(
    getMarkdownLinks("A link: (http://example.com/test)."),
    ["http://example.com/test"],
  );
});

Deno.test("getMarkdownLinks - URL not ending with parenthesis but within them", () => {
  assertEquals(
    getMarkdownLinks("Text (like https://example.com/inside) more text."),
    ["https://example.com/inside"],
  );
});

Deno.test("getMarkdownLinks - multiple different messy links", () => {
  const markdown =
    "Link http://one.com. Link (https://two.com).Also `www.three.com`";
  const expected = [
    "http://one.com",
    "https://two.com",
    "www.three.com",
  ];
  // Order might vary due to Set conversion, so sort for comparison
  assertEquals(getMarkdownLinks(markdown).sort(), expected.sort());
});
