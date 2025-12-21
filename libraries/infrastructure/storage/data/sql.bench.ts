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

import { sql } from "./sql.ts";

// Large test data for benchmarking
const largeArrayValues = Array.from({ length: 100 }, (_, i) => i);
const largeArrayOfSql = Array.from(
  { length: 50 },
  (_, i) => sql`field${i} = ${"value" + i}`,
);
const complexNestedSql = sql`
  SELECT * FROM users 
  WHERE id IN (${largeArrayValues}) 
  AND status = ${"active"}
`;

Deno.bench("sql - large array of values (IN clause)", () => {
  sql`SELECT * FROM users WHERE id IN (${largeArrayValues})`;
});

Deno.bench("sql - large array of SqlInstructions", () => {
  sql`UPDATE users SET ${largeArrayOfSql} WHERE id = ${1}`;
});

Deno.bench("sql - complex nested query", () => {
  sql`SELECT * FROM (${complexNestedSql}) as subquery WHERE created_at > ${Date.now()}`;
});

Deno.bench("sql - complex query with many parameters", () => {
  const values = Array.from({ length: 20 }, (_, i) => i);
  sql`
    INSERT INTO logs (user_id, action, metadata, timestamp, value1, value2, value3)
    VALUES ${
    values.map((v) =>
      sql`(${v}, ${"action"}, ${"meta"}, ${Date.now()}, ${v * 2}, ${v * 3}, ${
        v * 4
      })`
    )
  }
  `;
});
