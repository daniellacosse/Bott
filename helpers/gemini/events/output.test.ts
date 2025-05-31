import { assertEquals } from "jsr:@std/assert/equals";
import { _extractTopLevelObjectsFromString } from "./output.ts";
import type { GeminiOutputEvent } from "./output.ts";
import { BottEventType } from "@bott/model";

// Helper to create a valid GeminiOutputEvent for tests
const createValidEvent = (
  content: string,
  parentId?: string,
): GeminiOutputEvent => {
  const event: GeminiOutputEvent = {
    type: BottEventType.MESSAGE,
    details: { content },
  };
  if (parentId) {
    event.parent = { id: parentId };
  }
  return event;
};

Deno.test("_extractTopLevelObjectsFromString - empty string", () => {
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString("");
  assertEquals(extractedObjects, []);
  assertEquals(remainder, "");
});

Deno.test("_extractTopLevelObjectsFromString - string with no JSON objects", () => {
  const input = "this is just some text";
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, []);
  assertEquals(remainder, input);
});

Deno.test("_extractTopLevelObjectsFromString - single complete valid JSON object", () => {
  const input = `{ "type": "message", "details": { "content": "hello" } }`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, [createValidEvent("hello")]);
  assertEquals(remainder, "");
});

Deno.test("_extractTopLevelObjectsFromString - two complete valid JSON objects, comma-separated", () => {
  const input =
    `{ "type": "message", "details": { "content": "event1" } }, { "type": "message", "details": { "content": "event2" } }`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, [
    createValidEvent("event1"),
    createValidEvent("event2"),
  ]);
  assertEquals(remainder, "");
});

Deno.test("_extractTopLevelObjectsFromString - objects with leading/trailing whitespace and around comma", () => {
  const input =
    `  { "type": "message", "details": { "content": "event1" } }  ,  { "type": "message", "details": { "content": "event2" }, "parent": {"id": "p1"} }  `;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, [
    createValidEvent("event1"),
    createValidEvent("event2", "p1"),
  ]);
  assertEquals(remainder, "  ");
});

Deno.test("_extractTopLevelObjectsFromString - valid object followed by incomplete object", () => {
  const input =
    `{ "type": "message", "details": { "content": "first" } }, { "type": "message", "details": { "content": "second incomplete"`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, [createValidEvent("first")]);
  assertEquals(
    remainder,
    `{ "type": "message", "details": { "content": "second incomplete"`,
  );
});

Deno.test("_extractTopLevelObjectsFromString - only an incomplete object", () => {
  const input = `{ "type": "message", "details": {`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, []);
  assertEquals(remainder, input);
});

Deno.test("_extractTopLevelObjectsFromString - object with nested structures", () => {
  const input =
    `{ "type": "message", "details": { "content": "hello", "nested": { "key": "value" } } }`;
  const expectedEvent: GeminiOutputEvent = {
    type: BottEventType.MESSAGE,
    details: { content: "hello", nested: { key: "value" } } as any,
  };
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects.length, 1);
  assertEquals(extractedObjects[0].type, expectedEvent.type);
  assertEquals(extractedObjects[0].details.content, "hello");
  // @ts-ignore: checking for non-standard property for test
  assertEquals(extractedObjects[0].details.nested.key, "value");
  assertEquals(remainder, "");
});

Deno.test("_extractTopLevelObjectsFromString - object with escaped quotes in string", () => {
  const input =
    `{ "type": "message", "details": { "content": "hello \\\"world\\\"" } }`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, [createValidEvent(`hello "world"`)]);
  assertEquals(remainder, "");
});

Deno.test("_extractTopLevelObjectsFromString - valid object, then just a comma", () => {
  const input = `{ "type": "message", "details": { "content": "event1" } },`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, [createValidEvent("event1")]);
  assertEquals(remainder, ""); // Comma is consumed
});

Deno.test("_extractTopLevelObjectsFromString - valid object, then comma, then non-JSON text", () => {
  const input =
    `{ "type": "message", "details": { "content": "event1" } }, and then some text`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, [createValidEvent("event1")]);
  assertEquals(remainder, "and then some text");
});

Deno.test("_extractTopLevelObjectsFromString - string starting with unexpected closing brace", () => {
  const input = `}} { "type": "message", "details": { "content": "event1" } }`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, [createValidEvent("event1")]);
  assertEquals(remainder, "");
});

Deno.test("_extractTopLevelObjectsFromString - string starting with unexpected closing brace then valid", () => {
  const input =
    `{ "type": "message", "details": { "content": "event1" } } } { "type": "message", "details": { "content": "event2" } }`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, [
    createValidEvent("event1"),
    createValidEvent("event2"),
  ]);
  assertEquals(remainder, "");
});

Deno.test("_extractTopLevelObjectsFromString - buffer ending mid-object, mid-string", () => {
  const input = `{ "type": "message", "details": { "content": "hello`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, []);
  assertEquals(remainder, input);
});

Deno.test("_extractTopLevelObjectsFromString - buffer ending mid-object, mid-escape", () => {
  const input = `{ "type": "message", "details": { "content": "hello \\`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, []);
  assertEquals(remainder, input);
});

Deno.test("_extractTopLevelObjectsFromString - multiple valid objects without comma", () => {
  const input =
    `{ "type": "message", "details": { "content": "event1" } } { "type": "message", "details": { "content": "event2" } }`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, [
    createValidEvent("event1"),
    createValidEvent("event2"),
  ]);
  assertEquals(
    remainder,
    "",
  );
});

Deno.test("_extractTopLevelObjectsFromString - valid object, text, then another valid object (no comma)", () => {
  const input =
    `{ "type": "message", "details": { "content": "event1" } } some text { "type": "message", "details": { "content": "event2" } }`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects, [
    createValidEvent("event1"),
    createValidEvent("event2"),
  ]);
  assertEquals(
    remainder,
    "",
  );
});

Deno.test("_extractTopLevelObjectsFromString - complex nested object that is valid", () => {
  const input = `{
    "type": "message",
    "details": {
      "content": "This is a test with \\"escaped quotes\\" and a newline\\ncharacter.",
      "metadata": {
        "source": "test-suite",
        "tags": ["json", "parser", "stream"],
        "nestedAgain": { "value": true, "anotherValue": null }
      }
    },
    "parent": { "id": "parent-123" }
  }`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects.length, 1);
  const event = extractedObjects[0];
  assertEquals(event.type, "message");
  assertEquals(
    event.details.content,
    `This is a test with "escaped quotes" and a newline\ncharacter.`,
  );
  // @ts-ignore
  assertEquals(event.details.metadata.source, "test-suite");
  // @ts-ignore
  assertEquals(event.details.metadata.tags, ["json", "parser", "stream"]);
  // @ts-ignore
  assertEquals(event.details.metadata.nestedAgain.value, true);
  assertEquals(event.parent?.id, "parent-123");
  assertEquals(remainder, "");
});

Deno.test("_extractTopLevelObjectsFromString - handles \\\\ (escaped backslash) correctly", () => {
  const input =
    `{ "type": "message", "details": { "content": "C:\\\\path\\\\to\\\\file" } }`;
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects.length, 1);
  assertEquals(extractedObjects[0].details.content, "C:\\path\\to\\file");
  assertEquals(remainder, "");
});

Deno.test("_extractTopLevelObjectsFromString - handles unicode escapes correctly", () => {
  const input =
    `{ "type": "message", "details": { "content": "Hello \\u00D8ivind" } }`; // Ø
  const { extractedObjects, remainder } = _extractTopLevelObjectsFromString(
    input,
  );
  assertEquals(extractedObjects.length, 1);
  assertEquals(extractedObjects[0].details.content, "Hello Øivind");
  assertEquals(remainder, "");
});
