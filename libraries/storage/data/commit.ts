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

import { STORAGE_DATA_CLIENT as client } from "../start.ts";
import type { SqlInstructions } from "./sql.ts";

const QUERY_DEBUG_MAX_LENGTH = 250;

export type TransactionResults = {
  // deno-lint-ignore no-explicit-any
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

  // deno-lint-ignore no-explicit-any
  let reads: any[] = [];
  let writes = 0;
  let transactionStarted = false;
  let currentInstruction;

  try {
    client.exec("begin");
    transactionStarted = true;

    for (currentInstruction of instructions) {
      if (!currentInstruction) {
        continue;
      }

      const { query, params } = currentInstruction;

      const statement = client.prepare(query);
      const isReadQuery = query.trim().toLowerCase().startsWith("select");

      if (isReadQuery) {
        reads = [...reads, ...statement.all(...params)];
        continue;
      }

      writes += Number(statement.run(...params).changes);
    }

    currentInstruction = null;
    client.exec("commit");
  } catch (error) {
    if (transactionStarted) {
      client.exec("rollback");
    }

    const messageParts = ["Error executing SQL transaction."];
    if (currentInstruction) {
      const querySnippet = currentInstruction.query.trim().replaceAll(
        /\s+/g,
        " ",
      )
        .slice(0, QUERY_DEBUG_MAX_LENGTH);
      const paramsString = JSON.stringify(currentInstruction.params);
      messageParts.push(
        `Failed on instruction: "${querySnippet}${
          querySnippet.length === QUERY_DEBUG_MAX_LENGTH ? "…" : ""
        }" with parameters: ${paramsString}.`,
      );
    }

    const successfulParts = [];
    if (reads.length > 0) {
      successfulParts.push(`${reads.length} read(s)`);
    }

    if (writes > 0) {
      successfulParts.push(`${writes} write(s)`);
    }

    if (successfulParts.length > 0) {
      messageParts.push(
        `(${successfulParts.join(" and ")} succeeded before rollback.)`,
      );
    }

    return {
      error: new Error(messageParts.join(" "), {
        cause: error as Error,
      }),
    };
  }

  return { reads, writes };
};
