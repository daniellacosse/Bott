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

import type { BottChannel } from "@bott/model";
import { BottServiceEvent } from "@bott/services";

import { commit } from "../commit.ts";
import { sql } from "../sql.ts";

export const getEvents = async (
  ...ids: string[]
): Promise<BottServiceEvent[]> => {
  const result = commit(
    sql`
      select
        e.id as e_id, e.type as e_type, e.detail as e_detail, e.created_at as e_created_at, e.last_processed_at as e_last_processed_at, -- event
        c.id as c_id, c.name as c_name, c.description as c_description, c.config as c_config, -- channel
        s.id as s_id, s.name as s_name, s.description as s_description, -- space
        u.id as u_id, u.name as u_name, -- user
        p.id as p_id, -- parent event
        a.id as a_id, a.source_url as a_source_url, -- attachment
        rf.id as rf_id, rf.type as rf_type, rf.path as rf_path, -- raw file
        cf.id as cf_id, cf.type as cf_type, cf.path as cf_path -- compressed file
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
        attachments a on e.id = a.parent_id
      left join
        files rf on a.raw_file_id = rf.id
      left join
        files cf on a.compressed_file_id = cf.id
      where
        e.id in (${ids})
      order by e.created_at asc`,
  );

  if ("error" in result) {
    throw result.error;
  }

  const events = new Map<string, BottServiceEvent>();

  for (
    const {
      e_id: id,
      e_type: type,
      e_detail: detail,
      e_created_at: createdAt,
      e_last_processed_at: lastProcessedAt,
      ...rowData
    } of result.reads
  ) {
    if (events.has(id)) {
      continue;
    }

    const event = new BottServiceEvent(type, {
      detail: JSON.parse(detail),
    });

    event.id = id;
    event.createdAt = new Date(createdAt);
    event.lastProcessedAt = lastProcessedAt
      ? new Date(lastProcessedAt)
      : undefined;

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

    events.set(id, event);
  }

  // Handle attachments
  for (const rowData of result.reads) {
    if (!rowData.a_id || !events.has(rowData.e_id)) {
      continue;
    }

    const event = events.get(rowData.e_id)!;

    if (!event.attachments) {
      event.attachments = [];
    }

    if (event.attachments.find((a) => a.id === rowData.a_id)) {
      continue;
    }

    event.attachments.push({
      id: rowData.a_id,
      originalSource: new URL(rowData.a_source_url),
      raw: {
        id: rowData.rf_id,
        file: new File([Deno.readFileSync(rowData.rf_path)], rowData.rf_path, {
          type: rowData.rf_type,
        }),
        path: rowData.rf_path,
      },
      compressed: {
        id: rowData.cf_id,
        file: new File([Deno.readFileSync(rowData.cf_path)], rowData.cf_path, {
          type: rowData.cf_type,
        }),
        path: rowData.cf_path,
      },
      parent: event,
    });
  }

  // Handle parent events
  for (const rowData of result.reads) {
    if (rowData.p_id && events.has(rowData.e_id)) {
      const event = events.get(rowData.e_id)!;
      if (!event.parent) {
        [event.parent] = await getEvents(rowData.p_id);
      }
    }
  }

  return [...events.values()];
};

export const getEventHistory = (channel: BottChannel): Promise<BottServiceEvent[]> => {
  const result = commit(
    sql`
      select e.id
      from events e
      where e.channel_id = ${channel.id}`,
  );

  if ("error" in result) {
    throw result.error;
  }

  return getEvents(...result.reads.map(({ id }: { id: string; }) => id));
};