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

import { assertEquals, assertFalse } from "jsr:@std/assert";

import {
  type BottEventClassifier,
  BottEventRuleType,
  type BottGlobalSettings,
} from "../../../../model/types.ts";
import { reduceClassifiersForRuleType, reduceRulesForType } from "./reduce.ts";

const mockClassifier1: BottEventClassifier = {
  name: "isSpam",
  definition: "Determines if the content is spam.",
  examples: { 1: ["not spam"], 5: ["buy now!"] },
};

const mockClassifier2: BottEventClassifier = {
  name: "isUrgent",
  definition: "Determines if the content is urgent.",
  examples: { 1: ["later"], 5: ["asap"] },
};

const mockSettings: BottGlobalSettings = {
  identity: "Test Bot",
  classifiers: {
    isSpam: mockClassifier1,
    isUrgent: mockClassifier2,
  },
  rules: {
    filterSpam: {
      name: "filterSpam",
      type: BottEventRuleType.FILTER_INPUT,
      definition: "isSpam > 3",
      requiredClassifiers: { isSpam: mockClassifier1 },
    },
    anotherFilter: {
      name: "anotherFilter",
      type: BottEventRuleType.FILTER_INPUT,
      definition: "isUrgent > 4",
      requiredClassifiers: { isUrgent: mockClassifier2 },
    },
    outputRule: {
      name: "outputRule",
      type: BottEventRuleType.FILTER_OUTPUT,
      definition: "isSpam > 1",
      requiredClassifiers: { isSpam: mockClassifier1 },
    },
    missingClassifierRule: {
      name: "missingClassifierRule",
      type: BottEventRuleType.FILTER_INPUT,
      definition: "isMissing > 1",
      requiredClassifiers: {
        isMissing: {
          name: "isMissing",
          definition: "A classifier not in global settings",
          examples: { 1: ["a"], 5: ["b"] },
        },
      },
    },
  },
};

Deno.test("reduceClassifiersForRuleType", async (t) => {
  await t.step(
    "should return a map of required classifiers for a given rule type",
    () => {
      const result = reduceClassifiersForRuleType(
        mockSettings,
        BottEventRuleType.FILTER_INPUT,
      );

      assertEquals(Object.keys(result).length, 2);
      assertFalse(!result.isSpam);
      assertFalse(!result.isUrgent);
      assertEquals(result["isSpam"], mockClassifier1);
    },
  );

  await t.step(
    "should not include classifiers from rules of a different type",
    () => {
      const result = reduceClassifiersForRuleType(
        mockSettings,
        BottEventRuleType.FILTER_OUTPUT,
      );

      assertEquals(Object.keys(result).length, 1);
      assertFalse(!result.isSpam);
      assertFalse("isUrgent" in result);
    },
  );

  await t.step(
    "should not include classifiers if the rule requires a classifier not present in global settings",
    () => {
      const result = reduceClassifiersForRuleType(
        mockSettings,
        BottEventRuleType.FILTER_INPUT,
      );

      // The 'missingClassifierRule' should be ignored
      assertEquals(Object.keys(result).length, 2);
      assertFalse("isMissing" in result);
    },
  );
});

Deno.test("reduceRulesForType", async (t) => {
  await t.step("should return a map of rules for a given rule type", () => {
    const result = reduceRulesForType(
      mockSettings,
      BottEventRuleType.FILTER_INPUT,
    );

    assertEquals(Object.keys(result).length, 2);
    assertFalse(!result.filterSpam);
    assertFalse(!result.anotherFilter);
    assertFalse("outputRule" in result);
  });

  await t.step(
    "should not include rules that require classifiers not present in global settings",
    () => {
      const result = reduceRulesForType(
        mockSettings,
        BottEventRuleType.FILTER_INPUT,
      );

      assertEquals(Object.keys(result).length, 2);
      assertFalse("missingClassifierRule" in result);
    },
  );
});
