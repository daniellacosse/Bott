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

import type { BottEvent, BottEventType, BottFile } from "@bott/model";
import { log } from "@bott/logger";

import { commit } from "../commit.ts";
import { sql } from "../sql.ts";
import { resolveFile } from "../../files/resolve.ts";

export const getEvents = async (
  ...ids: string[]
): Promise<BottEvent[]> => {
  const result = commit(
    sql`
      select
        e.id as e_id, e.type as e_type, e.details as e_details, e.created_at as e_created_at, e.last_processed_at as e_last_processed_at, -- event
        c.id as c_id, c.name as c_name, c.description as c_description, c.config as c_config, -- channel
        s.id as s_id, s.name as s_name, s.description as s_description, -- space
        u.id as u_id, u.name as u_name, -- user
        p.id as p_id, -- parent event
        f.id as f_id, f.source_url as f_source_url -- file
      from
        events e
      left join
        events p on e.parent_id = p.id
      left join
        channels c on e.channel_id = c.id
      left join
        spaces s on c.space_id = s.id
      left join
        users u on e.user_id = u.id
      left join
        files f on e.id = f.parent_id
      where
        e.id in (${ids})
      order by e.created_at asc`,
  );

  if ("error" in result) {
    throw result.error;
  }

  const events = new Map<string, BottEvent>();

  for (
    const {
      e_id: id,
      e_type: type,
      e_details: details,
      e_created_at: createdAt,
      e_last_processed_at: lastProcessedAt,
      ...rowData
    } of result.reads
  ) {
    let fileInRow: BottFile | undefined;
    if (rowData.f_id) {
      try {
        fileInRow = await resolveFile({
          id: rowData.f_id,
          source: rowData.f_source_url
            ? new URL(rowData.f_source_url)
            : undefined,
        });
      } catch (e) {
        log.warn(`Failed to resolve file [${rowData.f_id}]: ${e}`);
      }
    }

    if (events.has(id)) {
      if (fileInRow) {
        events.get(id)!.files ??= [];
        events.get(id)!.files!.push(fileInRow);
      }

      continue;
    }

    const event: BottEvent = {
      id,
      type: type as BottEventType,
      details: JSON.parse(details),
      createdAt: new Date(createdAt),
      lastProcessedAt: lastProcessedAt ? new Date(lastProcessedAt) : undefined,
      files: fileInRow ? [fileInRow] : undefined,
    };

    if (rowData.c_id) {
      event.channel = {
        id: rowData.c_id,
        name: rowData.c_name,
        description: rowData.c_description,
        space: {
          id: rowData.s_id,
          name: rowData.s_name,
          description: rowData.s_description,
        },
      };
    }

    if (rowData.u_id) {
      event.user = {
        id: rowData.u_id,
        name: rowData.u_name,
      };
    }

    if (rowData.p_id) {
      [event.parent] = await getEvents(rowData.p_id);
    }

    events.set(id, event);
  }

  return [...events.values()];
};

export const getEventIdsForChannel = (channelId: string): string[] => {
  const result = commit(
    sql`
      select e.id
      from events e
      where e.channel_id = ${channelId}`,
  );

  if ("error" in result) {
    throw result.error;
  }

  // deno-lint-ignore no-explicit-any
  return result.reads.map(({ id }: any) => id);
};
