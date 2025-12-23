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

import { budgetedStringify } from "./budgetedStringify.ts";

// Large test data for benchmarking
const largeString = "a".repeat(10000);
const largeObject = {
  users: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    metadata: {
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      tags: ["tag1", "tag2", "tag3"],
    },
  })),
};
const deeplyNestedObject = (() => {
  let obj: Record<string, unknown> = { value: "leaf" };
  for (let i = 0; i < 50; i++) {
    obj = { nested: obj };
  }
  return obj;
})();
const largeArray = Array.from({ length: 1000 }, (_, i) => `string ${i}`);

Deno.bench("budgetedStringify - large string exceeds budget", () => {
  budgetedStringify(largeString, 100);
});

Deno.bench("budgetedStringify - large object exceeds budget", () => {
  budgetedStringify(largeObject, 500);
});

Deno.bench("budgetedStringify - deeply nested object", () => {
  budgetedStringify(deeplyNestedObject, 1000);
});

Deno.bench("budgetedStringify - large array of strings", () => {
  budgetedStringify(largeArray, 500);
});

Deno.bench("budgetedStringify - very tight budget on large object", () => {
  budgetedStringify(largeObject, 50);
});
