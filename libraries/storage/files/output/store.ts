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

import { type BottOutputFile, BottOutputFileType } from "@bott/model";

import { STORAGE_FILE_OUTPUT_ROOT } from "../../start.ts";

export const storeOutputFile = (
  data: Uint8Array,
  type: BottOutputFileType,
  filename?: string,
): BottOutputFile => {
  const id = crypto.randomUUID();
  let path = type + "/" + (filename ?? id);

  for (const [key, value] of Object.entries(BottOutputFileType)) {
    if (value === type) {
      path += "." + key.toLowerCase();
      break;
    }
  }

  Deno.mkdirSync(join(STORAGE_FILE_OUTPUT_ROOT, type), { recursive: true });
  Deno.writeFileSync(join(STORAGE_FILE_OUTPUT_ROOT, path), data);

  return {
    id,
    data,
    type,
    path,
  };
};
