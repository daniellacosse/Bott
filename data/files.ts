import { exec, sql } from "./client.ts";
import type { BottEvent } from "./events.ts";

// TODO: fix this later
exec(
  sql`
    create if not exists table files (
      id integer not null primary key autoincrement,
      name text not null,
      data blob not null,
      mimetype varchar(32) not null,
      event_id integer not null,
      foreign key(event_id) references events(id)
    )
  `
);

export interface BottFile {
  id: number;
  name: string;
  data: Uint8Array;
  mimetype: string;
  event: BottEvent;
}

export const getFiles = (...id: number[]): BottFile[] => {
  return exec(
    sql`
      select
        files.id,
        files.name,
        files.data,
        files.mimetype,
        events.id as event_id,
        events.name as event
        from files
      inner join events on files.event_id = events.id
      where files.id in (${id})
    `
  );
};

export const addFiles = (...files: BottFile[]): boolean => {
  return exec(
    sql`
      insert into files (
        name,
        data,
        mimetype,
        event_id
        )
      values ${files.map((file) => sql`(${file.name}, ${file.data}, ${file.mimetype}, ${file.event.id})`)}
    `
  );
};
