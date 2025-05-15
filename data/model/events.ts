import { commit } from "../client/commit.ts";
import { sql } from "../client/sql.ts";

import { type BottChannel, getAddChannelsSql } from "./channels.ts";
import { type BottUser, getAddUsersSql } from "./users.ts";

export enum BottEventType {
  MESSAGE = "message",
  REPLY = "reply",
  REACTION = "reaction",
}

export interface BottEvent<D extends object = { content: string }> {
  id: string;
  type: BottEventType;
  details: D;
  timestamp: Date;
  channel?: BottChannel;
  parent?: BottEvent;
  user?: BottUser;
}

export const eventsTableSql = sql`
  create table if not exists events (
    id varchar(36) primary key not null,
    type varchar(16) not null,
    details text,
    parent_id varchar(36),
    channel_id varchar(36),
    user_id varchar(36),
    timestamp datetime not null,
    foreign key(parent_id) references events(id),
    foreign key(channel_id) references channels(id),
    foreign key(user_id) references users(id)
  )
`;

const getAddEventsSql = (...events: BottEvent[]) => {
  const values = events.map((event) =>
    sql`(${event.id}, ${event.type}, ${JSON.stringify(event.details)}, ${
      event.parent?.id ?? null
    }, ${event.channel?.id ?? null}, ${
      event.user?.id ?? null
    }, ${event.timestamp.toISOString()})`
  );

  return sql`
    insert into events (id, type, details, parent_id, channel_id, user_id, timestamp)
    values ${values} 
    on conflict(id) do nothing
  `;
};

export const addEvents = (...events: BottEvent[]) => {
  const channels = [];
  const users = [];
  const parents = [];

  for (const event of events) {
    if (event.channel) {
      channels.push(event.channel);
    }

    if (event.user) {
      users.push(event.user);
    }

    if (event.parent) {
      parents.push(event.parent);
    }
  }

  return commit(
    getAddChannelsSql(...channels),
    getAddUsersSql(...users),
    getAddEventsSql(...parents),
    getAddEventsSql(...events),
  );
};

export const getEvents = (...ids: string[]): BottEvent[] => {
  const result = commit(
    sql`
      select
        e.id as e_id, e.type as e_type, e.details as e_details, e.timestamp as e_timestamp,
        p.id as p_id, p.type as p_type, p.details as p_details, p.timestamp as p_timestamp,
        c.id as c_id, c.name as c_name, c.description as c_description, c.config as c_config,
        s.id as s_id, s.name as s_name, s.description as s_description,
        u.id as u_id, u.name as u_name
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
      where
        e.id in (${ids})
    `,
  );

  if ("error" in result) {
    throw result.error;
  }

  return result.reads.map(
    (
      {
        e_id: id,
        e_type: type,
        e_details: details,
        e_timestamp: timestamp,
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
          space: { // Populate space for the channel
            id: context.s_id,
            name: context.s_name,
            description: context.s_description,
          },
        };
        if (context.c_config) {
          event.channel.config = JSON.parse(context.c_config);
        }
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
          timestamp: new Date(context.p_timestamp),
        };
      }

      return event;
    },
  );
};

// TODO: do this in a single query
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

  return result.reads.map(({ e_id: id }) => id);
};
