// TODO(#2): tests
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateText } from "./generate.ts";
import { assertThrows } from "https://deno.land/std@0.224.0/assert/assert_throws.ts";
type MockGenerateContentResponse = {
  text: string;
  candidates?: Array<{
    citationMetadata?: {
      citations: Array<{ uri?: string }>;
    };
  }>;
};

Deno.test("generateText should append formatted citations when present", async () => {
  const mockApiResponse: MockGenerateContentResponse = {
    text: "This is the generated text.",
    candidates: [
      {
        citationMetadata: {
          citations: [
            { uri: "https://example.com/source1" },
            { uri: undefined }, // Test that undefined URIs are skipped
            { uri: "https://example.com/source2" },
          ],
        },
      },
    ],
  };

  const mockGeminiClient = {
    models: {
      generateContent: () => Promise.resolve(mockApiResponse),
    },
  } as any;

  const prompt = "A prompt that yields citations";
  const options = {
    gemini: mockGeminiClient,
  };

  const result = await generateText(prompt, options);

  const expectedOutput =
    "This is the generated text.\n### Sources\n- [https://example.com/source1](https://example.com/source1)\n- [https://example.com/source2](https://example.com/source2)";

  assertEquals(
    result,
    expectedOutput,
    "Output should include formatted citations",
  );
});

Deno.test("generateText should truncate text correctly when citations are present and characterLimit is hit", async () => {
  const longText =
    "This is very long generated text that definitely needs to be truncated before we add citations.";
  const mockApiResponse: MockGenerateContentResponse = {
    text: longText,
    candidates: [
      {
        citationMetadata: {
          citations: [
            { uri: "https://example.com/source1" },
          ],
        },
      },
    ],
  };

  const mockGeminiClient = {
    models: {
      generateContent: () => Promise.resolve(mockApiResponse),
    },
  } as any;

  const prompt = "A prompt yielding long text and citations";
  const characterLimit = 100;
  const options = {
    gemini: mockGeminiClient,
    characterLimit: characterLimit,
  };

  const result = await generateText(prompt, options);

  const expectedCitationText =
    "\n### Sources\n- [https://example.com/source1](https://example.com/source1)";
  const expectedTextLength = characterLimit - expectedCitationText.length - 1;
  const expectedTruncatedText = longText.slice(0, expectedTextLength) + "…";

  const expectedOutput = expectedTruncatedText + expectedCitationText;

  assertEquals(
    result,
    expectedOutput,
    "Output should be truncated correctly with citations appended",
  );
  assertEquals(
    result.length <= characterLimit,
    true,
    "Output length should respect the character limit",
  );
});

Deno.test("generateText should handle responses with no citations", async () => {
  const mockApiResponse: MockGenerateContentResponse = {
    text: "This text has no citations.",
    candidates: [
      {
        // No citationMetadata
      },
    ],
  };

  const mockGeminiClient = {
    models: {
      generateContent: () => Promise.resolve(mockApiResponse),
    },
  } as any;

  const prompt = "A prompt that yields no citations";
  const options = {
    gemini: mockGeminiClient,
  };

  const result = await generateText(prompt, options);

  const expectedOutput = "This text has no citations.";
  assertEquals(
    result,
    expectedOutput,
    "Output should be just the text when no citations are present",
  );
});
