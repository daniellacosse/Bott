import type { SqlInstructions } from "./sql.ts";

import { DatabaseSync } from "node:sqlite";

export type TransactionResults = {
  reads: any[];
  writes: number;
} | {
  error: Error;
};

const client = new DatabaseSync(Deno.env.get("DB_PATH") ?? "test.db");

export const commit = (
  ...instructions: SqlInstructions[]
): TransactionResults => {
  let reads: any[] = [];
  let writes = 0;

  try {
    client.exec("begin");

    for (const { query, params } of instructions) {
      const statement = client.prepare(query);
      const isReadQuery = query.trim().toLowerCase().startsWith("select");

      if (isReadQuery) {
        reads = [...reads, ...statement.all(...params)];
        continue;
      }

      writes += Number(statement.run(...params).changes);
    }

    client.exec("commit");
  } catch (error) {
    client.exec("rollback");

    return { error: error as Error };
  }

  return { reads, writes };
};
