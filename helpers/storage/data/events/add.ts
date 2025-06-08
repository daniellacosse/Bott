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

import { join } from "jsr:@std/path";

import {
  type AnyBottEvent,
  type BottChannel,
  type BottInputFile,
  type BottOutputFile,
  type BottSpace,
  type BottUser,
  isBottInputFile,
  isBottOutputFile,
} from "@bott/model";

import { sql } from "../sql.ts";
import { commit } from "../commit.ts";
import {
  STORAGE_FILE_INPUT_ROOT,
  STORAGE_FILE_OUTPUT_ROOT,
} from "../../start.ts";

const getAddChannelsSql = (
  ...channels: BottChannel[]
) => {
  if (!channels.length) {
    return;
  }

  const values = channels.map((channel) =>
    sql`(${channel.id}, ${channel.space.id}, ${channel.name}, ${channel.description}, ${
      JSON.stringify({})
    })`
  );

  return sql`
    insert into channels (id, space_id, name, description, config)
    values ${values} 
    on conflict(id) do update set
      space_id = excluded.space_id,
      name = excluded.name,
      description = excluded.description,
      config = excluded.config
  `;
};

const getAddEventsSql = (...events: AnyBottEvent[]) => {
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

const getAddInputFilesSql = (...inputs: BottInputFile[]) => {
  if (!inputs.length) {
    return;
  }

  return sql`
  insert into input_files (
    url,
    type,
    path,
    parent_id,
    parent_type
  ) values ${
    inputs.map((f) =>
      sql`(${f.url.toString()}, ${f.type}, ${f.path}, ${f.parent?.id}, "event")`
    )
  } on conflict(url) do update set
    type = excluded.type,
    path = excluded.path,
    parent_id = excluded.parent_id,
    parent_type = excluded.parent_type`;
};

const getAddOutputFilesSql = (...outputs: BottOutputFile[]) => {
  if (!outputs.length) {
    return;
  }

  return sql`
  insert into output_files (
    id,
    type,
    path,
    parent_id,
    parent_type
  ) values ${
    outputs.map((f) =>
      sql`(${f.id}, ${f.type}, ${f.path}, ${f.parent?.id}, "event")`
    )
  } on conflict(id) do update set
    type = excluded.type,
    path = excluded.path,
    parent_id = excluded.parent_id,
    parent_type = excluded.parent_type`;
};

const getAddSpacesSql = (...spaces: BottSpace[]) => {
  if (!spaces.length) {
    return;
  }

  const values = spaces.map((space) =>
    sql`(${space.id}, ${space.name}, ${space.description})`
  );

  return sql`
    insert into spaces (id, name, description)
    values ${values} on conflict(id) 
    do update set
      name = excluded.name,
      description = excluded.description
  `;
};

const getAddUsersSql = (...users: BottUser[]) => {
  if (!users.length) {
    return;
  }

  const values = users.map((user) => sql`(${user.id}, ${user.name})`);

  return sql`
    insert into users (id, name)
    values ${values}
    on conflict(id) do update set
      name = excluded.name
  `;
};

export const addEventsData = (...inputEvents: AnyBottEvent[]) => {
  // Extract all unique entities (events, spaces, channels, users)
  const events = new Map<string, AnyBottEvent>();
  const _queue: AnyBottEvent[] = [...inputEvents];
  const _seenEvents = new Set<string>();

  while (_queue.length > 0) {
    const currentEvent = _queue.shift()!;

    events.set(currentEvent.id, currentEvent);
    _seenEvents.add(currentEvent.id);

    if (
      // We haven't seen this parent before, add it to the queue:
      currentEvent.parent && !_seenEvents.has(currentEvent.parent.id)
    ) {
      _queue.push(currentEvent.parent);
      _seenEvents.add(currentEvent.parent.id);
    }
  }

  const spaces = new Map<string, BottSpace>();
  const channels = new Map<string, BottChannel>();
  const users = new Map<string, BottUser>();
  const inputFiles = new Map<string, BottInputFile>();
  const outputFiles = new Map<string, BottOutputFile>();

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
        try {
          if (
            isBottInputFile(file) &&
            Deno.statSync(join(STORAGE_FILE_INPUT_ROOT, file.path)).isFile
          ) {
            inputFiles.set(file.url.toString(), { ...file, parent: event });
          } else if (
            isBottOutputFile(file) &&
            Deno.statSync(join(STORAGE_FILE_OUTPUT_ROOT, file.path)).isFile
          ) {
            outputFiles.set(file.id, { ...file, parent: event });
          }
        } catch (_) {
          // Not a prepared file, ignore.
        }
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
    getAddInputFilesSql(...inputFiles.values()),
    getAddOutputFilesSql(...outputFiles.values()),
  );

  if ("error" in results) {
    throw results.error;
  }

  return results;
};

function topologicallySortEvents(
  ...events: AnyBottEvent[]
): AnyBottEvent[] {
  const result: AnyBottEvent[] = [];

  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(event: AnyBottEvent) {
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
