import { join } from "jsr:@std/path";
import { DatabaseSync } from "node:sqlite";

import dbClientSchema from "./data/schema.sql";

export let FS_ROOT: string;
export let FS_ASSET_ROOT: string;
export let FS_ASSET_SIZE_CAUTION: number;
export let FS_DB_CLIENT: DatabaseSync;

export const startStorage = (
  root = join(Deno.cwd(), "output"),
  { assetSizeCautionBytes = 100_000 } = {},
) => {
  // Create assets folder:
  const assetRoot = join(root, "assets");

  Deno.mkdirSync(assetRoot, { recursive: true });

  FS_ROOT = root;
  FS_ASSET_ROOT = assetRoot;
  FS_ASSET_SIZE_CAUTION = assetSizeCautionBytes;

  // Create database file:
  FS_DB_CLIENT = new DatabaseSync(
    join(root, "data.db"),
  );

  // Initialize database tables:
  FS_DB_CLIENT.prepare(dbClientSchema).run();
};
