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
import {
  type AnyShape,
  type BottAction,
  type BottActionOption,
  BottActionOptionType,
  type BottActionResultEvent,
  type BottEventClassifier,
} from "@bott/model";
import { getActionSchema, getEventClassifierSchema } from "./responseSchema.ts";
import { Type as GeminiStructuredResponseType } from "npm:@google/genai";

const createMockAction = (
  props: { description?: string; options?: BottActionOption[] } = {},
): BottAction<AnyShape, AnyShape> =>
  Object.assign(() => ({} as BottActionResultEvent<AnyShape>), props);

Deno.test("getEventClassifierSchema", async (t) => {
  await t.step("should generate a valid schema for given classifiers", () => {
    const classifiers: Record<string, BottEventClassifier> = {
      isSpam: {
        name: "isSpam",
        definition: "Determines if the content is spam.",
        examples: { 1: ["not spam"], 5: ["buy now!"] },
      },
    };

    const schema = getEventClassifierSchema(classifiers);

    assertExists(schema);
    assertEquals(schema.type, GeminiStructuredResponseType.OBJECT);
    assertExists(schema.properties?.isSpam);
    assertEquals(schema.required, ["isSpam"]);

    const isSpamProp = schema.properties!.isSpam;
    assertEquals(isSpamProp.type, GeminiStructuredResponseType.OBJECT);
    assertExists(isSpamProp.properties?.score);
    assertExists(isSpamProp.properties?.rationale);
    assertEquals(isSpamProp.required, ["score"]);

    const scoreProp = isSpamProp.properties!.score;
    assertEquals(scoreProp.type, GeminiStructuredResponseType.NUMBER);
    assertEquals(scoreProp.enum, ["1", "2", "3", "4", "5"]);
  });

  await t.step("should handle classifiers without a definition", () => {
    const classifiers: Record<string, BottEventClassifier> = {
      isSimple: {
        name: "isSimple",
        definition: "",
        examples: { 1: ["complex"], 5: ["simple"] },
      },
    };

    const schema = getEventClassifierSchema(classifiers);
    assertExists(schema);
    const isSimpleProp = schema.properties!.isSimple;
    assertExists(isSimpleProp.description);
    assertEquals(
      isSimpleProp.description?.startsWith(
        `How much this message pertains to "isSimple".`,
      ),
      true,
    );
  });
});

Deno.test("getActionSchema", async (t) => {
  await t.step(
    "should generate a valid schema for actions with options",
    () => {
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
              required: false,
            },
          ],
        }),
      };

      const schema = getActionSchema(actions);
      assertExists(schema);

      assertEquals(schema.required, ["name"]);
      assertExists(schema.properties?.name);
      assertExists(schema.properties?.options);
      assertEquals(schema.properties.name.enum, ["generateMedia"]);

      const optionsSchema = schema.properties.options;
      assertEquals(optionsSchema?.type, GeminiStructuredResponseType.OBJECT);
      assertExists(optionsSchema?.oneOf);
      assertEquals(optionsSchema.oneOf?.length, 1);

      const handlerOptions = optionsSchema.oneOf![0];
      assertEquals(handlerOptions.required, ["type"]);
      assertExists(handlerOptions.properties?.type);
      assertExists(handlerOptions.properties?.prompt);

      assertEquals(
        handlerOptions.properties.type.type,
        GeminiStructuredResponseType.STRING,
      );
      assertEquals(handlerOptions.properties.type.enum, ["image", "video"]);
    },
  );

  await t.step("should generate a schema for actions without options", () => {
    const actions: Record<string, BottAction<AnyShape, AnyShape>> = {
      simpleAction: createMockAction({
        description: "A simple action.",
      }),
    };

    const schema = getActionSchema(actions);
    assertExists(schema);
    assertEquals(schema.required, ["name"]);
    assertExists(schema.properties?.name);
    assertEquals(schema.properties?.options, undefined);
  });

  await t.step("should return undefined for no actions", () => {
    const schema = getActionSchema({});
    assertEquals(schema, undefined);
  });
});
