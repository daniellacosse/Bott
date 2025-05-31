import { sql } from "../helpers/database/sql.ts";

import type { BottEvent } from "./events.ts";

export interface BottFile {
  id: string;
  type: BottFileType;
  data: Uint8Array;
  path: string;
  // Just BottEvents for now.
  parent?: BottEvent<object>;
}

export enum BottFileType {
  MP4 = "video/mp4",
  JPEG = "image/jpeg",
  MD = "text/markdown",
  MP3 = "audio/mp3",
}

export const filesTableSql = sql`
  create table if not exists files (
    id varchar(36) primary key not null,
    type text not null,
    path text unique not null,
    parent_id varchar(36),
    parent_type text
  )
`;

export const getAddFilesSql = (...files: BottFile[]) => {
  if (!files.length) {
    return;
  }

  return sql`
  insert into files (
    id,
    type,
    path,
    parent_id,
    parent_type
  ) values ${
    files.map((f) =>
      sql`(${f.id}, ${f.type}, ${f.path}, ${f.parent?.id}, "event")`
    )
  } on conflict(id) do update set
    type = excluded.type,
    path = excluded.path,
    parent_id = excluded.parent_id,
    parent_type = excluded.parent_type`;
};
