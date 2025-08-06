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

/**
 * Fully resolves a `BottFile` object by ensuring its `raw` and `compressed` data are available.
 * If `raw` data is missing, it attempts to fetch it from the `source` URL.
 * If `compressed` data is missing, it generates it from the `raw` data based on the file type.
 * @param file `file` to be resolved.
 * @returns `BottFile` with its `raw` and `compressed` data populated.
 */
export const resolveFile = async (file: BottFile): Promise<BottFile> => {
  const fileRoot = join(STORAGE_FILE_ROOT, file.id);

  Deno.mkdirSync(fileRoot, { recursive: true });

  let rawFilePath, compressedFilePath;
  for (const file of Deno.readDirSync(fileRoot)) {
    if (file.name.startsWith("raw.")) {
      rawFilePath = join(fileRoot, file.name);
    } else if (file.name.startsWith("compressed.")) {
      compressedFilePath = join(fileRoot, file.name);
    }
  }

  if (rawFilePath) {
    const rawFileExtension = rawFilePath.split(".").pop();

    file.raw = {
      data: Deno.readFileSync(rawFilePath),
      type: BottFileType[
        rawFileExtension?.toUpperCase() as keyof typeof BottFileType
      ],
    };
  }

  if (!file.raw) {
    if (!file.source) {
      throw new Error(
        "File source URL is required when raw data is missing.",
      );
    }

    console.debug(
      `[DEBUG] Fetching raw file from source URL: ${file.source}`,
    );
    const response = await fetch(file.source);
    const data = new Uint8Array(await response.arrayBuffer());
    const type = response.headers.get("content-type")?.split(";")[0].trim() ??
      "";

    if (!Object.values(BottFileType).includes(type as BottFileType)) {
      throw new Error(`Unsupported content type: ${type}`);
    }

    file.raw = { data, type: type as BottFileType };
  }

  if (!rawFilePath) {
    console.debug(
      `[DEBUG] Writing raw file to disk: ${file.id}, type: ${file.raw.type}`,
    );

    Deno.writeFileSync(
      join(
        fileRoot,
        `raw.${REVERSE_FILE_TYPE_ENUM[file.raw.type].toLowerCase()}`,
      ),
      file.raw.data,
    );
  }

  if (compressedFilePath) {
    const compressedFileExtension = compressedFilePath.split(".").pop();

    file.compressed = {
      data: Deno.readFileSync(compressedFilePath),
      type: BottFileType[
        compressedFileExtension
          ?.toUpperCase() as keyof typeof BottFileType
      ],
    };
  }

  if (!file.compressed) {
    if (!file.raw) {
      throw new Error(
        "File raw data is required when compressed data is missing.",
      );
    }

    const rawData = file.raw.data as Uint8Array;
    const rawType = file.raw.type;

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
        file.compressed = { data, type: BottFileType.MD };
        break;
      }
      case BottFileType.HTML:
        file.compressed = await prepareHtmlAsMarkdown(
          rawData,
        );
        break;
      case BottFileType.PNG:
      case BottFileType.JPEG:
        file.compressed = await prepareStaticImageAsWebp(
          rawData,
        );
        break;
      case BottFileType.MP3:
      case BottFileType.WAV:
        file.compressed = await prepareAudioAsOpus(
          rawData,
        );
        break;
      case BottFileType.GIF:
      case BottFileType.MP4:
        file.compressed = await prepareDynamicImageAsMp4(
          rawData,
        );
        break;
      default:
        throw new Error(`Unsupported source type: ${rawType}`);
    }
  }

  if (!compressedFilePath) {
    console.debug(
      `[DEBUG] Writing compressed file to disk: ${file.id}, type: ${file.compressed.type}`,
    );

    Deno.writeFileSync(
      join(
        fileRoot,
        `compressed.${
          REVERSE_FILE_TYPE_ENUM[file.compressed.type]
            .toLowerCase()
        }`,
      ),
      file.compressed.data,
    );
  }

  return file;
};
