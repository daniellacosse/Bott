import { commit } from "../client/commit.ts";
import { sql } from "../database/sql.ts";

import { type BottFile, getAddFilesSql } from "./files.ts";
import { type BottChannel, getAddChannelsSql } from "./channels.ts";
import { type BottSpace, getAddSpacesSql } from "./spaces.ts";
import { type BottUser, getAddUsersSql } from "./users.ts";

export enum BottEventType {
  MESSAGE = "message",
  REPLY = "reply",
  REACTION = "reaction",
  REQUEST = "request",
  RESPONSE = "response",
}

export interface BottEvent<
  D extends object = { content: string },
  T extends BottEventType = BottEventType,
> {
  id: string;
  type: T;
  details: D;
  timestamp: Date;
  channel?: BottChannel;
  parent?: BottEvent<D, T>;
  user?: BottUser;
  files?: BottFile<D, T>[];
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

const getAddEventsSql = <
  D extends object = { content: string },
  T extends BottEventType = BottEventType,
>(...events: BottEvent<D, T>[]) => {
  if (!events.length) {
    return;
  }

  const values = events.map((event) =>
    sql`(${event.id}, ${event.type}, ${
      JSON.stringify(event.details)
    }, ${event.parent?.id}, ${event.channel?.id}, ${event.user?.id}, ${event.timestamp.toISOString()})`
  );

  return sql`
    insert into events (id, type, details, parent_id, channel_id, user_id, timestamp)
    values ${values} 
    on conflict(id) do nothing
  `;
};

export const addEvents = <
  D extends object = { content: string },
  T extends BottEventType = BottEventType,
>(...inputEvents: BottEvent<D, T>[]) => {
  // Extract all unique entities (events, spaces, channels, users)
  const events = new Map<string, BottEvent<D, T>>();
  const _queue: BottEvent<D, T>[] = [...inputEvents];
  const _seenEvents = new Set<string>();

  while (_queue.length > 0) {
    const currentEvent = _queue.shift()!;

    events.set(currentEvent.id, currentEvent);
    _seenEvents.add(currentEvent.id);

    if (
      // We haven't seen this parent before, add it to the queue:
      currentEvent.parent && !_seenEvents.has(currentEvent.parent.id)
    ) {
      _queue.push(currentEvent.parent as BottEvent<D, T>);
      _seenEvents.add(currentEvent.parent.id);
    }
  }

  const spaces = new Map<string, BottSpace>();
  const channels = new Map<string, BottChannel>();
  const users = new Map<string, BottUser>();
  const files = new Map<string, BottFile<D, T>>();

  for (const event of events.values()) {
    if (event.channel) {
      spaces.set(event.channel.space.id, event.channel.space);
      channels.set(event.channel.id, event.channel);
    }

    if (event.user) {
      users.set(event.user.id, event.user);
    }

    if (event.files) {
      for (const file of event.files) {
        files.set(file.id, { ...file, parent: event });
      }
    }
  }

  const results = commit(
    getAddSpacesSql(...spaces.values()),
    getAddChannelsSql(...channels.values()),
    getAddUsersSql(...users.values()),
    getAddEventsSql(
      ...topologicallySortEvents(...events.values()),
    ),
    getAddFilesSql(...files.values()),
  );

  // Write new files to the file system.
  for (const file of files.values()) {
    if (file.url.protocol === "file:") {
      Deno.writeFileSync(file.name, file.data);
    }
  }

  return results;
};

export const getEvents = async (...ids: string[]): Promise<BottEvent[]> => {
  const result = commit(
    sql`
      select
        e.id as e_id, e.type as e_type, e.details as e_details, e.timestamp as e_timestamp, -- event
        c.id as c_id, c.name as c_name, c.description as c_description, c.config as c_config, -- channel
        s.id as s_id, s.name as s_name, s.description as s_description, -- space
        u.id as u_id, u.name as u_name, -- user
        p.id as p_id, -- parent event
        f.id as f_id, f.name as f_name, f.description as f_description, f.mimetype as f_mimetype, f.data as f_data, f.url as f_url -- file
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

  const events = new Map<string, BottEvent>();

  const _makeFile = async (context: any) => {
    const fileUrl = new URL(context.f_url);
    const fileResponse = await fetch(fileUrl);

    return {
      id: context.f_id,
      name: context.f_name,
      description: context.f_description,
      mimetype: context.f_mimetype,
      data: new Uint8Array(await fileResponse.arrayBuffer()),
      url: new URL(context.f_url),
    };
  };

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

      event.files ??= [];
      event.files.push(await _makeFile(context));

      continue;
    }

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
      event.parent = (await getEvents(context.p_id))[0];
    }

    if (context.f_id) {
      event.files = [await _makeFile(context)];
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

  return result.reads.map(({ id }) => id);
};

function topologicallySortEvents<
  D extends object = { content: string },
  T extends BottEventType = BottEventType,
>(
  ...events: BottEvent<D, T>[]
): BottEvent<D, T>[] {
  const result: BottEvent<D, T>[] = [];

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(event: BottEvent<D, T>) {
    if (visited.has(event.id) || visiting.has(event.id)) {
      return; // Cycle detected, break it
    }

    visiting.add(event.id);
    // If the event has a parent, visit it first
    if (event.parent) {
      visit(event.parent);
    }
    visiting.delete(event.id);

    visited.add(event.id);
    result.push(event);
  }

  for (const event of events) {
    if (visited.has(event.id)) {
      continue;
    }

    visit(event);
  }

  return result;
}
