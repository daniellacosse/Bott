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

import type { BottEvent, BottEventAttachment } from "@bott/events";
import type { BottChannel, BottSpace, BottUser } from "@bott/model";

import { commit, type TransactionResults } from "../commit.ts";
import { sql } from "../sql.ts";

const getAddChannelsSql = (
  ...channels: BottChannel[]
) => {
  if (!channels.length) {
    return;
  }

  const values = channels.map((channel) =>
    sql`(${channel.id}, ${channel.space.id}, ${channel.name}, ${channel.description})`
  );

  return sql`
    insert into channels (id, space_id, name, description)
    values ${values} 
    on conflict(id) do update set
      space_id = excluded.space_id,
      name = excluded.name,
      description = excluded.description
  `;
};

const getAddEventsSql = (...events: BottEvent[]) => {
  if (!events.length) {
    return;
  }

  const values = events.map((event) => {
    const shallowEvent = event.toJSON();

    return sql`(${shallowEvent.id}, ${shallowEvent.type}, ${
      JSON.stringify(shallowEvent.detail)
    }, ${shallowEvent.parent?.id}, ${shallowEvent.channel?.id}, ${shallowEvent.user.id}, ${shallowEvent.createdAt}, ${
      shallowEvent.lastProcessedAt ?? null
    })`;
  });

  return sql`
    insert into events (id, type, detail, parent_id, channel_id, user_id, created_at, last_processed_at)
    values ${values} 
    on conflict(id) do update set
      detail = excluded.detail,
      last_processed_at = excluded.last_processed_at
  `;
};

const getAddFilesSql = (
  ...files: { id: string; file: File; path: string }[]
) => {
  if (!files.length) {
    return;
  }

  const values = files.map((file) =>
    sql`(${file.id}, ${file.file.type}, ${file.path})`
  );

  if (!values.length) {
    return;
  }

  return sql`
    insert into files (id, type, path)
    values ${values}
    on conflict (id) do update set 
      type = excluded.type,
      path = excluded.path
  `;
};

const getAddAttachmentsSql = (...attachments: BottEventAttachment[]) => {
  if (!attachments.length) {
    return;
  }

  const values = attachments.map((attachment) => {
    const source = attachment.originalSource instanceof URL
      ? attachment.originalSource.href
      : String(attachment.originalSource);

    return sql`(${attachment.id}, ${source}, ${attachment.raw.id}, ${attachment.compressed.id}, ${attachment.parent.id})`;
  });

  if (!values.length) {
    return;
  }

  return sql`
    insert into attachments (id, source_url, raw_file_id, compressed_file_id, parent_id)
    values ${values}
    on conflict (id) do update set 
      source_url = excluded.source_url,
      raw_file_id = excluded.raw_file_id,
      compressed_file_id = excluded.compressed_file_id,
      parent_id = excluded.parent_id
  `;
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

export const upsertEvents = (
  ...bottEvents: BottEvent[]
): TransactionResults => {
  // Extract all unique entities (events, spaces, channels, users)
  const events = new Map<string, BottEvent>();
  const _queue: BottEvent[] = bottEvents;
  const _seenEvents = new Set<string>();

  while (_queue.length > 0) {
    const currentEvent = _queue.shift()!;

    if (!events.has(currentEvent.id)) {
      events.set(currentEvent.id, currentEvent);
    }
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
  const attachments: BottEventAttachment[] = [];
  const files = [];

  for (const event of events.values()) {
    if (event.channel) {
      spaces.set(event.channel.space.id, event.channel.space);
      channels.set(event.channel.id, event.channel);
    }

    if (event.user) {
      users.set(event.user.id, event.user);
    }

    if (event.attachments) {
      for (const attachment of event.attachments) {
        attachments.push(attachment);
        files.push(attachment.raw, attachment.compressed);
      }
    }
  }

  const statements = [
    getAddSpacesSql(...spaces.values()),
    getAddChannelsSql(...channels.values()),
    getAddUsersSql(...users.values()),
    getAddFilesSql(...files),
    getAddEventsSql(...topologicallySortEvents(...events.values())),
    getAddAttachmentsSql(...attachments),
  ];

  const results = commit(...statements.filter((smt) => smt !== undefined));

  return results;
};

function topologicallySortEvents(
  ...events: BottEvent[]
): BottEvent[] {
  const result: BottEvent[] = [];

  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(event: BottEvent) {
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
