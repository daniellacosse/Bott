import { exec, sql } from "./client.ts";

import { BottChannel } from "./channels.ts";
import { BottUser } from "./users.ts";

exec(
  sql`
    create table if not exists events (
      id integer primary key not null,
      type tinyint not null,
      data blob not null,
      parent_id integer,
      channel_id integer,
      user_id integer,
      timestamp datetime not null
    )
  `,
);

export enum EventType {
  MESSAGE = 0,
  REPLY = 1,
  REACTION = 2,
}

export interface BottEvent {
  id: number;
  channel?: BottChannel;
  parent?: BottEvent;
  user?: BottUser;
  type: EventType;
  data: Uint8Array;
  timestamp: Date;
}

export const getEvents = (...ids: number[]): BottEvent[] => {
  const rows = exec(
    sql`
      select
        e.id as e_id, e.type as e_type, e.data as e_data, e.timestamp as e_ts,
        p.id as p_id, p.type as p_type, p.data as p_data, p.timestamp as p_ts,
        c.id as c_id, c.name as c_name, c.description as c_description,
        u.id as u_id, u.name as u_name
      from
        events e
      left join
        events p on e.parent_id = p.id
      left join
        channels c on e.channel_id = c.id
      left join
        users u on e.user_id = u.id
      where
        e.id in (${ids})
    `,
  ) as any[];

  return rows.map(
    ({ e_id: id, e_type: type, e_data: data, e_ts: timestamp, ...context }) => {
      const event: BottEvent = {
        id,
        type,
        data: new Uint8Array(data),
        timestamp: new Date(timestamp),
      };

      if (context.c_id) {
        event.channel = {
          id: context.c_id,
          name: context.c_name,
          description: context.c_description,
        };
      }

      if (context.u_id) {
        event.user = {
          id: context.u_id,
          name: context.u_name,
        };
      }

      if (context.p_id) {
        event.parent = {
          id: context.p_id,
          type: context.p_type,
          data: new Uint8Array(context.p_data),
          timestamp: new Date(context.p_ts),
        };
      }

      return event;
    },
  );
};

export const addEvents = (...events: BottEvent[]): boolean => {
  try {
    exec(
      sql`
        insert into events
        (id, type, data, parent_id, channel_id, user_id, timestamp)
        values ${
        events.map((event) =>
          sql`(${event.id}, ${event.type}, ${event.data}, ${
            event.parent?.id ?? null
          }, ${event.channel?.id ?? null}, ${
            event.user?.id ?? null
          }, ${event.timestamp.toISOString()})`
        )
      }
      `,
    );
    return true;
  } catch (_) {
    return false;
  }
};
