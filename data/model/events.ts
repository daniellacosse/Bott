import { exec, sql } from "../client.ts";

import type { BottChannel } from "./channels.ts";
import type { BottUser } from "./users.ts";

exec(
  sql`
    create table if not exists events (
      id integer primary key not null,
      type varchar(16) not null,
      details text,
      parent_id integer,
      channel_id integer,
      user_id integer,
      timestamp datetime not null
      foreign key(parent_id) references events(id),
      foreign key(channel_id) references channels(id),
      foreign key(user_id) references users(id)
    )
  `,
);

export enum EventType {
  MESSAGE = "message",
  REPLY = "reply",
  REACTION = "reaction",
}

export interface BottEvent<D extends object = { content: string }> {
  id: number;
  type: EventType;
  details: D;
  timestamp: Date;
  channel?: BottChannel;
  parent?: BottEvent;
  user?: BottUser;
}

export const getEvents = (...ids: number[]): BottEvent[] => {
  const rows = exec(
    sql`
      select
        e.id as e_id, e.type as e_type, e.details as e_details, e.timestamp as e_ts,
        p.id as p_id, p.type as p_type, p.details as p_details, p.timestamp as p_ts,
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
    (
      {
        e_id: id,
        e_type: type,
        e_details: details,
        e_ts: timestamp,
        ...context
      },
    ) => {
      const event: BottEvent = {
        id,
        type,
        details: JSON.parse(details),
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
          details: JSON.parse(context.p_details),
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
        (id, type, details, parent_id, channel_id, user_id, timestamp)
        values ${
        events.map((event) =>
          sql`(${event.id}, ${event.type}, ${JSON.stringify(event.details)}, ${
            event.parent?.id ?? null
          }, ${event.channel?.id ?? null}, ${
            event.user?.id ?? null
          }, ${event.timestamp.toISOString()})`
        )
      } on conflict do nothing
      `,
    );
    return true;
  } catch (_) {
    return false;
  }
};
