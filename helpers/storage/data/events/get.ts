import { join } from "jsr:@std/path";

import type {
  AnyBottEvent,
  BottEventType,
  BottInputFile,
  BottInputFileType,
  BottOutputFile,
  BottOutputFileType,
} from "@bott/model";

import { FS_FILE_INPUT_ROOT, FS_FILE_OUTPUT_ROOT } from "../../start.ts";
import { commit } from "../commit.ts";
import { sql } from "../sql.ts";

const _getFileFromRow = (
  row: any,
): BottInputFile | BottOutputFile | undefined => {
  if (row.i_url && Deno.statSync(join(FS_FILE_INPUT_ROOT, row.i_path)).isFile) {
    return {
      url: new URL(row.i_url),
      path: row.i_path,
      type: row.i_type,
      data: Deno.readFileSync(join(FS_FILE_INPUT_ROOT, row.i_path)),
    };
  }

  if (row.o_id && Deno.statSync(join(FS_FILE_OUTPUT_ROOT, row.o_path)).isFile) {
    return {
      id: row.o_id,
      path: row.o_path,
      type: row.o_type,
      data: Deno.readFileSync(join(FS_FILE_OUTPUT_ROOT, row.o_path)),
    };
  }

  return undefined;
};

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
        i.url as i_url, i.type as i_type, i.path as i_path, -- input file
        o.id as o_id, o.type as o_type, o.path as o_path -- output file
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
        inputs i on e.id = i.parent_id
      left join
        outputs o on e.id = o.parent_id
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
    let event: AnyBottEvent = {
      id,
      type: type as BottEventType,
      details: JSON.parse(details),
      timestamp: new Date(timestamp),
    };

    const file = _getFileFromRow(context);

    if (file && events.has(id)) {
      event = events.get(id)!;
      file.parent = event;

      event.files ??= [];
      file.parent = event;

      // The type of array here shouldn't matter.
      (event.files as any[]).push(file);

      continue;
    } else if (file) {
      file.parent = event;

      // The type of array here shouldn't matter.
      event.files = [file] as any[];
    }

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
