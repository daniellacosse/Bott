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

import { budgetedJoin } from "./budgetedJoin.ts";

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

Deno.bench("budgetedJoin - large string exceeds budget", () => {
  budgetedJoin([largeString], 100);
});

Deno.bench("budgetedJoin - large object exceeds budget", () => {
  budgetedJoin([largeObject], 500);
});

Deno.bench("budgetedJoin - deeply nested object", () => {
  budgetedJoin([deeplyNestedObject], 1000);
});

Deno.bench("budgetedJoin - large array of strings", () => {
  budgetedJoin(largeArray, 500);
});

Deno.bench("budgetedJoin - very tight budget on large object", () => {
  budgetedJoin([largeObject], 50);
});
