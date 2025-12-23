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

import type { BottPersona } from "@bott/model";

import { commit } from "../commit.ts";
import { sql } from "../sql.ts";
import { getAddUsersSql } from "../common/users.ts";

export const upsertPersona = (persona: BottPersona): void => {
  // Upsert space if provided
  if (persona.space) {
    const spaceResult = commit(
      sql`
        insert into spaces (id, name, description)
        values (${persona.space.id}, ${persona.space.name}, ${persona.space.description ?? null})
        on conflict(id) do update set
          name = excluded.name,
          description = excluded.description
      `,
    );

    if ("error" in spaceResult) {
      throw spaceResult.error;
    }
  }

  // Upsert user if provided (or create a new one with random UUID)
  let userId: string | null = null;
  if (persona.user) {
    userId = persona.user.id;
  } else {
    // Create a new user with a random UUID
    userId = crypto.randomUUID();
  }

  if (userId) {
    const userName = persona.user?.name ?? persona.displayName ?? persona.handle;
    
    const userSql = getAddUsersSql({ id: userId, name: userName });
    if (userSql) {
      const userResult = commit(userSql);
      
      if ("error" in userResult) {
        throw userResult.error;
      }
    }
  }

  // Upsert persona
  const result = commit(
    sql`
      insert into personas (id, user_id, display_name, handle, space_id)
      values (
        ${persona.id},
        ${userId},
        ${persona.displayName ?? null},
        ${persona.handle},
        ${persona.space.id}
      )
      on conflict(id) do update set
        user_id = excluded.user_id,
        display_name = excluded.display_name,
        handle = excluded.handle,
        space_id = excluded.space_id
    `,
  );

  if ("error" in result) {
    throw result.error;
  }
};
