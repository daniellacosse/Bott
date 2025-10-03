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
  AnyShape,
  BottAction,
  BottEventClassifier,
  BottEventRule,
} from "@bott/model";

export const getEventClassifierMarkdown = (
  classifiers: Record<string, BottEventClassifier>,
) => {
  return Object.values(classifiers)
    .map(({ name, definition, examples: exampleRecord }) => {
      const parts = [`#### \`${name}\``];

      if (definition) {
        parts.push(definition);
      }

      for (const [score, examples] of Object.entries(exampleRecord)) {
        parts.push(`\n**Examples of a \`${name}\` score of ${score}:**`);
        parts.push(
          ...examples.map((example: string) => `* "${example}"`),
        );
      }

      return parts.join("\n");
    })
    .join("\n\n");
};

export const getRuleMarkdown = (
  rules: Record<string, BottEventRule>,
) => {
  return Object.values(rules)
    .map(({ definition }) => `* ${definition}`)
    .join("\n");
};

export const getActionMarkdown = <O extends AnyShape>(
  actions: Record<string, BottAction<O, AnyShape>>,
) => {
  const result = [];

  for (const [name, action] of Object.entries(actions)) {
    let entry = `#### \`${name}\``;

    if (action.description) {
      entry += `\n${action.description}`;
    }

    entry += "\n";

    if (action.options) {
      entry += "| Option | Description | Type | Allowed Values | Required |\n";
      entry += "|---|---|---|---|---|\n";

      for (
        const { name, type, description, allowedValues, required } of action
          .options
      ) {
        entry += `| \`${name}\` | ${description ?? "-"} | ${type} | ${
          allowedValues
            ? allowedValues.map((value) => `\`${value}\``).join(", ")
            : "*"
        } | ${required ? "Yes" : "No"} |\n`;
      }
    }

    result.push(entry);
  }

  return result.join("\n\n");
};
