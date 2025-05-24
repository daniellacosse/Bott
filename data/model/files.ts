import { sql } from "../database/sql.ts";
import type { BottEvent, BottEventType } from "../main.ts";

export enum BottFileMimetypes {
  WAV = "audio/wav",
  PNG = "image/png",
  MP4 = "video/mp4",
  TXT = "text/plain",
}

export interface BottFile<
  D extends object = { content: string },
  T extends BottEventType = BottEventType,
> {
  id: string;
  name: string;
  description?: string;
  mimetype: BottFileMimetypes;
  data: Uint8Array;
  url: URL;
  // Just BottEvents for now.
  parent?: BottEvent<D, T>;
}

export const BottFileExtensionMap = new Map([
  [BottFileMimetypes.WAV, "wav"],
  [BottFileMimetypes.PNG, "png"],
  [BottFileMimetypes.MP4, "mp4"],
  [BottFileMimetypes.TXT, "txt"],
]);

export const filesTableSql = sql`
  create table if not exists files (
    id varchar(36) primary key not null,
    name text not null,
    description text,
    mimetype text not null,
    url text not null,
    parent_id varchar(36),
    parent_type text
  )
`;

export const getAddFilesSql = <
  D extends object = { content: string },
  T extends BottEventType = BottEventType,
>(
  ...files: BottFile<D, T>[]
) => {
  if (!files.length) {
    return;
  }

  return sql`
  insert into files (
    id,
    name,
    description,
    mimetype,
    url,
    parent_id,
    parent_type
  ) values (
    ${
    files.map((f) =>
      sql`(${f.id}, ${f.name}, ${f.description}, ${f.mimetype}, ${f.url.toString()}, ${f.parent?.id}, "event")`
    )
  }
  ) on conflict(id) do update set
    name = excluded.name,
    description = excluded.description,
    mimetype = excluded.mimetype,
    data = excluded.data
    url = excluded.url
    parent_id = excluded.parent_id,
    parent_type = excluded.parent_type`;
};
