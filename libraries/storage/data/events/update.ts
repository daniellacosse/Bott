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

import type { AnyBottEvent } from "@bott/model";
import { log } from "@bott/logger";

import { commit } from "../commit.ts";
import { sql } from "../sql.ts";

/**
 * Updates an existing event's details in the database.
 * @param event - The event with updated details to save
 */
export const updateEventDetails = async (
  event: AnyBottEvent,
): Promise<void> => {
  const result = commit(
    sql`
      update events 
      set details = ${JSON.stringify(event.details)}
      where id = ${event.id}`,
  );

  if ("error" in result) {
    log.error(`Failed to update event ${event.id}: ${result.error.message}`);
    throw result.error;
  }

  if (result.writes === 0) {
    log.warn(`No event found with id ${event.id} to update`);
  } else {
    log.debug(`Updated event ${event.id} with new details`);
  }
};
