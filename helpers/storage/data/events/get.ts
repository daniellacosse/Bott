import { commit } from "../commit.ts";
import { sql } from "../sql.ts";

import type { AnyBottEvent, BottAssetType, BottEventType } from "@bott/model";

export const getEvents = async (
  ...ids: string[]
): Promise<AnyBottEvent[]> => {
  const result = commit(
    sql`
      select
        e.id as e_id, e.type as e_type, e.details as e_details, e.timestamp as e_timestamp, -- event
        c.id as c_id, c.name as c_name, c.description as c_description, c.config as c_config, -- channel
        s.id as s_id, s.name as s_name, s.description as s_description, -- space
        u.id as u_id, u.name as u_name, -- user
        p.id as p_id, -- parent event
        f.id as f_id, f.path as f_path, f.type as f_type -- file
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
        files f on f.parent_id = e.id and f.parent_type = 'event'
      where
        e.id in (${ids})
      order by e.timestamp asc`,
  );

  if ("error" in result) {
    throw result.error;
  }

  const events = new Map<string, AnyBottEvent>();

  for (
    const {
      e_id: id,
      e_type: type,
      e_details: details,
      e_timestamp: timestamp,
      ...context
    } of result.reads
  ) {
    // add file to existing event
    if (events.has(id) && context.f_id) {
      const event = events.get(id)!;

      event.assets ??= [];
      event.assets.push({
        id: context.f_id,
        path: context.f_path,
        type: context.f_type as BottAssetType,
        data: Deno.readFileSync(context.f_path),
      });

      continue;
    }

    const event: AnyBottEvent = {
      id,
      type: type as BottEventType,
      details: JSON.parse(details),
      timestamp: new Date(timestamp),
    };

    if (context.c_id) {
      event.channel = {
        id: context.c_id,
        name: context.c_name,
        description: context.c_description,
        space: {
          id: context.s_id,
          name: context.s_name,
          description: context.s_description,
        },
      };
    }

    if (context.u_id) {
      event.user = {
        id: context.u_id,
        name: context.u_name,
      };
    }

    if (context.p_id) {
      event.parent = (await getEvents(context.p_id))[0];
    }

    if (context.f_id) {
      event.assets = [{
        id: context.f_id,
        path: context.f_path,
        type: context.f_type as BottAssetType,
        data: Deno.readFileSync(context.f_path),
      }];
    }

    events.set(id, event);
  }

  return [...events.values()];
};

// TODO: get channel history in a single query
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

  return result.reads.map(({ id }: any) => id);
};
