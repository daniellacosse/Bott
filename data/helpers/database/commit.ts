import type { SqlInstructions } from "./sql.ts";

import { DatabaseSync } from "node:sqlite";

export type TransactionResults = {
  reads: any[];
  writes: number;
} | {
  error: Error;
};

let client: DatabaseSync;

export const initDatabase = (dbPath = "test.db") =>
  client = new DatabaseSync(
    dbPath,
  );

export const commit = (
  ...instructions: (SqlInstructions | undefined)[]
): TransactionResults => {
  let reads: any[] = [];
  let writes = 0;

  try {
    client.exec("begin");

    for (const instruction of instructions) {
      if (!instruction) {
        continue;
      }

      const { query, params } = instruction;

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
