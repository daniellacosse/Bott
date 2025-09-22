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

import type {
  BottEventClassifier,
  BottEventRule,
  BottEventRuleType,
  BottGlobalSettings,
} from "@bott/model";

export const reduceClassifiersForRuleType = (
  settings: BottGlobalSettings,
  ruleType: BottEventRuleType,
): Record<string, BottEventClassifier> =>
  Object.entries(settings.rules).reduce(
    (acc, [, rule]) => {
      if (
        rule.type === ruleType &&
        rule.requiredClassifiers &&
        rule.requiredClassifiers.every((key) => key in settings.classifiers)
      ) {
        for (const key of rule.requiredClassifiers) {
          acc[key] = settings.classifiers[key];
        }
      }
      return acc;
    },
    {} as Record<string, BottEventClassifier>,
  );

export const reduceRulesForType = (
  settings: BottGlobalSettings,
  ruleType: BottEventRuleType,
): Record<string, BottEventRule> =>
  Object.entries(settings.rules).reduce(
    (acc, [, rule]) => {
      if (
        rule.type === ruleType &&
        rule.requiredClassifiers?.every((key) => key in settings.classifiers)
      ) {
        acc[rule.name] = rule;
      }

      return acc;
    },
    {} as Record<string, BottEventRule>,
  );
