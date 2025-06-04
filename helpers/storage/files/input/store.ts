import { join } from "jsr:@std/path";

import { FS_FILE_INPUT_ROOT } from "../../start.ts";

import { type BottInputFile, BottInputFileType } from "@bott/model";

import { SupportedRawFileType } from "../types.ts";
import { prepareHtml } from "./prepare/html.ts";
import { prepareStaticImageAsJpeg } from "./prepare/ffmpeg.ts";
import { commit } from "../../data/commit.ts";
import { sql } from "../../data/sql.ts";

export const _getResponseContentType = (response: Response): string => {
  const contentTypeHeader = response.headers.get("content-type");
  if (!contentTypeHeader) return "";
  return contentTypeHeader.split(";")[0].trim();
};

const _inputFileCache = new Map<string, BottInputFile>();

const _getInputFile = (url: URL): BottInputFile | undefined => {
  if (_inputFileCache.has(url.toString())) {
    // If this file is a part of a batch write,
    // the file's data is cached in memory but not written in the DB yet.
    return _inputFileCache.get(url.toString());
  }

  const data = commit(
    sql`
      select * from input_files where url = ${url.toString()};
    `,
  );

  if (!("reads" in data) || data.reads.length === 0) return;

  const [file] = data.reads;

  const result = {
    url: new URL(file.url),
    path: file.path,
    type: file.type as BottInputFileType,
    data: Deno.readFileSync(join(FS_FILE_INPUT_ROOT, file.path)),
  };

  _inputFileCache.set(url.toString(), result);

  return result;
};

export const storeNewInputFile = async (
  url: URL,
): Promise<BottInputFile> => {
  if (!FS_FILE_INPUT_ROOT) {
    throw new Error(
      "Storage has not been started: FS_FILE_INPUT_ROOT is not defined",
    );
  }

  const existingFile = _getInputFile(url);
  if (existingFile) {
    return existingFile;
  }

  // Resolve source URL:
  const response = await fetch(url);
  const sourceData = new Uint8Array(await response.arrayBuffer());
  const sourceType = _getResponseContentType(response);

  // Prepare file of type:
  let resultData, resultType;
  switch (sourceType) {
    case SupportedRawFileType.HTML:
      [resultData, resultType] = await prepareHtml(sourceData);
      break;
    case SupportedRawFileType.PNG:
    case SupportedRawFileType.JPEG:
      [resultData, resultType] = await prepareStaticImageAsJpeg(sourceData);
      break;
    default:
      throw new Error(`Unsupported source type: ${sourceType}`);
  }

  // Write to disk:
  let path = resultType as string;
  let name = url.pathname.split("/").pop() || "index";

  for (const [key, value] of Object.entries(BottInputFileType)) {
    if (resultType === value) {
      name += `.${
        Math.random().toString(36).substring(7)
      }.${key.toLowerCase()}`;
      break;
    }
  }

  path += `/${name}`;

  Deno.mkdirSync(join(FS_FILE_INPUT_ROOT, resultType), { recursive: true });
  Deno.writeFileSync(join(FS_FILE_INPUT_ROOT, path), resultData);

  // Return BottInputFile:
  const file = {
    url,
    path,
    type: resultType,
    data: resultData,
  };

  _inputFileCache.set(url.toString(), file);

  return file;
};
