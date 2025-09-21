/**
 * @license
 * This file is a part of Bott.
 *
 * This project is dual-licensed:
 * - Non-commercial use: AGPLv3 (see LICENSE file for full text).
 * - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
 *
 * Copyright (C) 2025 DanielLaCos.se
 */

import { assertEquals } from "jsr:@std/assert";
import {
  type AnyShape,
  type BottAction,
  type BottActionOption,
  BottActionOptionType,
  type BottActionResultEvent,
  type BottEventClassifier,
  type BottEventRule,
  BottEventRuleType,
} from "@bott/model";
import {
  getActionMarkdown,
  getEventClassifierMarkdown,
  getRuleMarkdown,
} from "./systemPrompt.ts";

const createMockAction = (
  props: { description?: string; options?: BottActionOption[] } = {},
): BottAction<AnyShape, AnyShape> =>
  Object.assign(() => ({} as BottActionResultEvent<AnyShape>), props);

// TODO: make these outputs better

Deno.test("getEventClassifierMarkdown", async (t) => {
  await t.step("should generate markdown for classifiers", () => {
    const classifiers: Record<string, BottEventClassifier> = {
      isSpam: {
        name: "isSpam",
        definition: "Determines if the content is spam.",
        examples: { 1: ["not spam"], 5: ["buy now!"] },
      },
      isUrgent: {
        name: "isUrgent",
        definition: "Determines if the content is urgent.",
        examples: { 1: ["later"], 5: ["asap", "urgent"] },
      },
    };

    const expected = `* **\`isSpam\`**: Determines if the content is spam.
  * not spam => Score: 1
  * buy now! => Score: 5
* **\`isUrgent\`**: Determines if the content is urgent.
  * later => Score: 1
  * asap => Score: 5
  * urgent => Score: 5`;

    assertEquals(getEventClassifierMarkdown(classifiers), expected);
  });

  await t.step("should handle classifiers without a definition", () => {
    const classifiers: Record<string, BottEventClassifier> = {
      isSimple: {
        name: "isSimple",
        definition: "", // Empty definition
        examples: { 1: ["complex"], 5: ["simple"] },
      },
    };

    const expected = `* **\`isSimple\`**
  * complex => Score: 1
  * simple => Score: 5`;

    assertEquals(getEventClassifierMarkdown(classifiers), expected);
  });

  await t.step("should return an empty string for no classifiers", () => {
    assertEquals(getEventClassifierMarkdown({}), "");
  });
});

Deno.test("getRuleMarkdown", async (t) => {
  await t.step(
    "should generate a sorted list of unique rule definitions",
    () => {
      const rules: Record<string, BottEventRule> = {
        ruleA: {
          name: "ruleA",
          type: BottEventRuleType.FILTER_INPUT,
          definition: "Rule C",
        },
        ruleB: {
          name: "ruleB",
          type: BottEventRuleType.FILTER_INPUT,
          definition: "Rule A",
        },
        ruleC: {
          name: "ruleC",
          type: BottEventRuleType.FILTER_INPUT,
          definition: "Rule C",
        }, // Duplicate
      };

      const expected = `* Rule A\n* Rule C`;
      assertEquals(getRuleMarkdown(rules), expected);
    },
  );

  await t.step("should return an empty string for no rules", () => {
    assertEquals(getRuleMarkdown({}), "");
  });
});

Deno.test("getActionMarkdown", async (t) => {
  await t.step("should generate markdown for actions with options", () => {
    const actions: Record<string, BottAction<AnyShape, AnyShape>> = {
      generateMedia: createMockAction({
        description: "Generates media based on a prompt.",
        options: [
          {
            name: "type",
            description: "The type of media to generate.",
            type: BottActionOptionType.STRING,
            allowedValues: ["image", "video"],
            required: true,
          },
          {
            name: "prompt",
            description: "The generation prompt.",
            type: BottActionOptionType.STRING,
            required: true,
          },
        ],
      }),
    };

    const expected = `**\`generateMedia\`**: Generates media based on a prompt.
| Option | Description | Type | Allowed Values | Required |
|---|---|---|---|---|
| \`type\` | \`The type of media to generate.\` | string | image, video | Yes |
| \`prompt\` | \`The generation prompt.\` | string | * | Yes |
`;

    assertEquals(getActionMarkdown(actions), expected);
  });

  await t.step("should handle actions with no description or options", () => {
    const actions: Record<string, BottAction<AnyShape, AnyShape>> = {
      simpleAction: createMockAction(),
    };

    const expected = `**\`simpleAction\`**
`;
    assertEquals(getActionMarkdown(actions), expected);
  });

  await t.step("should handle options with missing properties", () => {
    const actions: Record<string, BottAction<AnyShape, AnyShape>> = {
      actionWithOptions: createMockAction({
        options: [{ name: "opt1", type: BottActionOptionType.BOOLEAN }],
      }),
    };

    const expected = `**\`actionWithOptions\`**
| Option | Description | Type | Allowed Values | Required |
|---|---|---|---|---|
| \`opt1\` | \`-\` | boolean | * | No |
`;
    assertEquals(getActionMarkdown(actions), expected);
  });

  await t.step("should return an empty string for no actions", () => {
    assertEquals(getActionMarkdown({}), "");
  });
});
