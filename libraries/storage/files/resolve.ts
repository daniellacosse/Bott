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

import { type BottFile, BottFileType } from "@bott/model";

import { STORAGE_FILE_ROOT } from "../start.ts";
import { prepareHtmlAsMarkdown } from "./prepare/html.ts";
import {
  prepareAudioAsOpus,
  prepareDynamicImageAsMp4,
  prepareStaticImageAsWebp,
} from "./prepare/ffmpeg.ts";
import { join } from "node:path";
import { exists } from "jsr:@std/fs";

const MAX_TXT_WORDS = 600;

export const _getResponseContentType = (response: Response): string => {
  const contentTypeHeader = response.headers.get("content-type");
  if (!contentTypeHeader) return "";
  return contentTypeHeader.split(";")[0].trim();
};

export const resolveFile = async (
  partialFile: Partial<BottFile>,
): Promise<BottFile> => {
  if (!partialFile.id) {
    throw new Error("resolveFile: File ID is required.");
  }

  const fileRoot = join(STORAGE_FILE_ROOT, partialFile.id);
  const rawFilePath = join(fileRoot, "raw");
  const compressedFilePath = join(
    fileRoot,
    "compressed",
  );

  if (!partialFile.raw) {
    if (await exists(rawFilePath)) {
      partialFile.raw = {
        data: Deno.readFileSync(rawFilePath),
        type: BottFileType.TXT, // TODO: how do I determine this?
      };
    } else if (partialFile.source) {
      const response = await fetch(partialFile.source);
      const data = new Uint8Array(await response.arrayBuffer());
      const type = _getResponseContentType(response) as BottFileType;

      partialFile.raw = { data, type };
    } else {
      throw new Error("TODO");
    }
  }

  if (!(await exists(rawFilePath))) {
    Deno.mkdirSync(fileRoot, { recursive: true });
    Deno.writeFileSync(rawFilePath, partialFile.raw.data);
  }

  if (!partialFile.compressed) {
    if (await exists(compressedFilePath)) {
      partialFile.raw = {
        data: Deno.readFileSync(compressedFilePath),
        type: BottFileType.TXT, // TODO: how do I determine this?
      };
    } else {
      const rawData = partialFile.raw.data as Uint8Array;
      const rawType = partialFile.raw.type;

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
  }

  if (!(await exists(compressedFilePath))) {
    Deno.mkdirSync(fileRoot, { recursive: true });
    Deno.writeFileSync(rawFilePath, partialFile.compressed!.data);
  }

  return partialFile as BottFile;
};
