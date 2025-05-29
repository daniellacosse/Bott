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

import { extractFromHtml } from "npm:@extractus/article-extractor";

export const getFileFromUrl = async (
  rawUrl: string,
): Promise<BottFile | undefined> => {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (_) {
    // Must be a valid URL.
    return;
  }

  let response, type;
  try {
    response = await fetch(url);
    type = response.headers.get("content-type")?.split(
      /;\s*/,
    ).find((part) =>
      Object.values(BottFileType).includes(part as BottFileType)
    );
  } catch (error) {
    // Can't fetch this, continue.
    console.warn("[WARN] Failed to fetch URL:", error);
    return;
  }

  if (!type) {
    console.debug(
      "[DEBUG] Fetched URL is not a supported file type.",
      url.toString(),
      response.headers.get("content-type"),
    );
    return;
  }

  let data;
  if (type === BottFileType.HTML) {
    const result =
      (await extractFromHtml(await response.text(), url.toString()))
        ?.content;

    console.debug(
      "[DEBUG] Extracting HTML content.",
      "Characters:",
      result?.length,
      "Est. words:",
      result?.split(/\s+/).length,
    );

    data = new TextEncoder().encode(result);
  } else {
    data = new Uint8Array(await response.arrayBuffer());
  }

  let name = url.pathname.split("/").pop() || "index";

  // Try to add a file extension if there isn't one.
  if (!/\.[^/.]+$/.test(name)) {
    for (const [key, value] of Object.entries(BottFileType)) {
      if (type === value) {
        name += `.${key.toLowerCase()}`;
        break;
      }
    }
  }

  return {
    id: crypto.randomUUID(),
    type: type as BottFileType,
    url,
    name,
    data,
  };
};
