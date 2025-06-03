import { join } from "jsr:@std/path";
import { DatabaseSync } from "node:sqlite";

const dbClientSchema = Deno.readTextFileSync(
  new URL("./data/schema.sql", import.meta.url).pathname,
);

export let FS_ROOT: string;
export let FS_FILE_INPUT_ROOT: string;
export let FS_FILE_OUTPUT_ROOT: string;
export let FS_ASSET_SIZE_CAUTION: number;
export let FS_DB_CLIENT: DatabaseSync;

export const startStorage = (
  root: string,
  { assetSizeCautionBytes = 100_000 } = {},
) => {
  // Create asset cache folder:
  const fileInputRoot = join(root, "files/input");
  const fileOutputRoot = join(root, "files/output");

  Deno.mkdirSync(fileInputRoot, { recursive: true });
  Deno.mkdirSync(fileOutputRoot, { recursive: true });

  FS_ROOT = root;
  FS_FILE_INPUT_ROOT = fileInputRoot;
  FS_FILE_OUTPUT_ROOT = fileOutputRoot;
  FS_ASSET_SIZE_CAUTION = assetSizeCautionBytes;

  // Create database file:
  FS_DB_CLIENT = new DatabaseSync(
    join(root, "data.db"),
  );

  // Initialize database tables:
  FS_DB_CLIENT.exec(dbClientSchema);
};
