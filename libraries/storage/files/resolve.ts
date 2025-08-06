// /**
//  * @license
//  * This file is part of Bott.
//  *
//  * This project is dual-licensed:
//  * - Non-commercial use: AGPLv3 (see LICENSE file for full text).
//  * - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
//  *
//  * Copyright (C) 2025 DanielLaCos.se
//  */

import { join } from "jsr:@std/path";

import { type BottFile, BottFileType } from "@bott/model";

import { STORAGE_FILE_ROOT } from "../start.ts";
import { prepareHtmlAsMarkdown } from "./prepare/html.ts";
import {
  prepareAudioAsOpus,
  prepareDynamicImageAsMp4,
  prepareStaticImageAsWebp,
} from "./prepare/ffmpeg.ts";

const MAX_TXT_WORDS = 600;

const REVERSE_FILE_TYPE_ENUM = Object.fromEntries(
  Object.entries(BottFileType).map(([key, value]) => [value, key]),
);

export const _getResponseContentType = (response: Response): string => {
  const contentTypeHeader = response.headers.get("content-type");
  if (!contentTypeHeader) return "";
  return contentTypeHeader.split(";")[0].trim();
};

export const resolveFile = async (
  partialFile: Partial<BottFile>,
): Promise<BottFile> => {
  if (!partialFile.id) {
    throw new Error("File ID is required.");
  }

  const resolvedFileRoot = join(STORAGE_FILE_ROOT, partialFile.id);

  Deno.mkdirSync(resolvedFileRoot, { recursive: true });

  let rawFilePath, compressedFilePath;
  for (const file of Deno.readDirSync(resolvedFileRoot)) {
    if (file.name.startsWith("raw.")) {
      rawFilePath = join(resolvedFileRoot, file.name);
    } else if (file.name.startsWith("compressed.")) {
      compressedFilePath = join(resolvedFileRoot, file.name);
    }
  }

  if (rawFilePath && !partialFile.raw) {
    const rawFileExtension = rawFilePath.split(".").pop();

    partialFile.raw = {
      data: Deno.readFileSync(rawFilePath),
      type: BottFileType[
        rawFileExtension?.toUpperCase() as keyof typeof BottFileType
      ],
    };
  } else if (!rawFilePath && partialFile.raw) {
    Deno.writeFileSync(
      join(
        resolvedFileRoot,
        `raw.${
          REVERSE_FILE_TYPE_ENUM[partialFile.raw.type].toLowerCase()
        }`,
      ),
      partialFile.raw.data,
    );
  } else if (!rawFilePath && !partialFile.raw) {
    if (!partialFile.source) {
      throw new Error(
        "File source is required when raw data is missing.",
      );
    }

    const response = await fetch(partialFile.source);
    const data = new Uint8Array(await response.arrayBuffer());
    const type = response.headers.get("content-type")?.split(";")[0].trim() ??
      "";

    if (!(type in BottFileType)) {
      throw new Error(`Unsupported content type: ${type}`);
    }

    partialFile.raw = { data, type: type as BottFileType };
  }

  if (compressedFilePath && !partialFile.compressed) {
    const compressedFileExtension = compressedFilePath.split(".").pop();

    partialFile.compressed = {
      data: Deno.readFileSync(compressedFilePath),
      type: BottFileType[
        compressedFileExtension
          ?.toUpperCase() as keyof typeof BottFileType
      ],
    };
  } else if (!compressedFilePath && partialFile.compressed) {
    Deno.writeFileSync(
      join(
        resolvedFileRoot,
        `compressed.${
          REVERSE_FILE_TYPE_ENUM[partialFile.compressed.type]
            .toLowerCase()
        }`,
      ),
      partialFile.compressed.data,
    );
  } else if (!compressedFilePath && !partialFile.compressed) {
    const rawData = partialFile.raw!.data as Uint8Array;
    const rawType = partialFile.raw!.type;

    switch (rawType) {
      case BottFileType.TXT: {
        const textDecoder = new TextDecoder();
        let textContent = textDecoder.decode(rawData);
        const words = textContent.split(/\s+/);

        let data;
        if (words.length > MAX_TXT_WORDS) {
          textContent = words.slice(0, MAX_TXT_WORDS).join(" ") +
            "\n\n...(truncated)";
          data = new TextEncoder().encode(textContent);
        } else {
          data = rawData;
        }
        partialFile.compressed = { data, type: BottFileType.MD };
        break;
      }
      case BottFileType.HTML:
        partialFile.compressed = await prepareHtmlAsMarkdown(
          rawData,
        );
        break;
      case BottFileType.PNG:
      case BottFileType.JPEG:
        partialFile.compressed = await prepareStaticImageAsWebp(
          rawData,
        );
        break;
      case BottFileType.MP3:
      case BottFileType.WAV:
        partialFile.compressed = await prepareAudioAsOpus(
          rawData,
        );
        break;
      case BottFileType.GIF:
      case BottFileType.MP4:
        partialFile.compressed = await prepareDynamicImageAsMp4(
          rawData,
        );
        break;
      default:
        throw new Error(`Unsupported source type: ${rawType}`);
    }
  }

  return partialFile as BottFile;
};
