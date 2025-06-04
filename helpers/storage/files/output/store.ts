import { join } from "jsr:@std/path";

import { type BottOutputFile, BottOutputFileType } from "@bott/model";

import { FS_FILE_OUTPUT_ROOT } from "../../start.ts";

export const storeOutputFile = (
  data: Uint8Array,
  type: BottOutputFileType,
): BottOutputFile => {
  const id = crypto.randomUUID();
  let path = type + "/" + id;

  for (const [key, value] of Object.entries(BottOutputFileType)) {
    if (value === type) {
      path += "." + key;
      break;
    }
  }

  Deno.mkdirSync(join(FS_FILE_OUTPUT_ROOT, type), { recursive: true });
  Deno.writeFileSync(join(FS_FILE_OUTPUT_ROOT, path), data);

  return {
    id,
    data,
    type,
    path,
  };
};
