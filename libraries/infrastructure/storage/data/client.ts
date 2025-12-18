import { DatabaseSync } from "node:sqlite";
import { STORAGE_DATA_LOCATION, STORAGE_FILE_ROOT } from "@bott/constants";

const dbClientSchema = Deno.readTextFileSync(
  new URL("./schema.sql", import.meta.url).pathname,
);

Deno.mkdirSync(STORAGE_FILE_ROOT, { recursive: true });

export const client = new DatabaseSync(
  STORAGE_DATA_LOCATION,
);

client.exec(dbClientSchema);

