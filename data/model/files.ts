import { sql } from "../database/sql.ts";
import type { BottEvent } from "../main.ts";

export interface BottFile {
  id: string;
  name: string;
  description?: string;
  type: BottFileType;
  data: Uint8Array;
  url: URL;
  // Just BottEvents for now.
  parent?: BottEvent<object>;
}

export enum BottFileType {
  GIF = "image/gif",
  HTML = "text/html",
  MP4 = "video/mp4",
  PDF = "application/pdf",
  PNG = "image/png",
  JPEG = "image/jpeg",
  TXT = "text/plain",
  WAV = "audio/wav",
}

export const filesTableSql = sql`
  create table if not exists files (
    id varchar(36) primary key not null,
    name text not null,
    description text,
    type text not null,
    url text not null,
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
    name,
    description,
    type,
    url,
    parent_id,
    parent_type
  ) values ${
    files.map((f) =>
      sql`(${f.id}, ${f.name}, ${f.description}, ${f.type}, ${f.url.toString()}, ${f.parent?.id}, "event")`
    )
  } on conflict(id) do update set
    name = excluded.name,
    description = excluded.description,
    type = excluded.type,
    url = excluded.url,
    parent_id = excluded.parent_id,
    parent_type = excluded.parent_type`;
};
