import { STORAGE_DATA_CLIENT as client } from "../start.ts";
import type { SqlInstructions } from "./sql.ts";

export type TransactionResults = {
  reads: any[];
  writes: number;
} | {
  error: Error;
};

export const commit = (
  ...instructions: (SqlInstructions | undefined)[]
): TransactionResults => {
  if (!client) {
    return {
      error: new Error(
        "Storage has not been started: Database client is not defined",
      ),
    };
  }

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
