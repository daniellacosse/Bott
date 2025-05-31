import { dirname, join } from "jsr:@std/path";

export let FILE_SYSTEM_ROOT = "";
export let FILE_SYSTEM_SIZE_CAUTION = 0;

export const initFilesystem = (
  root = join(Deno.cwd(), "output"),
  limit = 100_000,
) => {
  FILE_SYSTEM_ROOT = root;
  FILE_SYSTEM_SIZE_CAUTION = limit;

  Deno.mkdirSync(FILE_SYSTEM_ROOT, { recursive: true });
};

export const writeData = (data: Uint8Array, path: string) => {
  if (!FILE_SYSTEM_ROOT) {
    throw new Error("Filesystem not initialized");
  }

  if (data.length > FILE_SYSTEM_SIZE_CAUTION) {
    console.warn("[WARN] File size exceeds caution limit:", path, data.length);
  }

  const absolutePath = join(FILE_SYSTEM_ROOT, path);

  Deno.mkdirSync(dirname(absolutePath), { recursive: true });

  Deno.writeFileSync(absolutePath, data);
};

export const readData = (path: string) => {
  if (!FILE_SYSTEM_ROOT) {
    throw new Error("Filesystem not initialized");
  }

  return Deno.readFileSync(join(FILE_SYSTEM_ROOT, path));
};
