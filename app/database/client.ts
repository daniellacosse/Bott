import { DatabaseSync } from "node:sqlite";

const client = new DatabaseSync(Deno.env.get("DB_PATH") ?? "test.db");

// very naive sql tag
export function sql(
  strings: TemplateStringsArray,
  ...interpolations: any[]
): () => any {
  let queryWithPlaceholders = strings.raw[0];
  for (let i = 0; i < interpolations.length; i++) {
    queryWithPlaceholders += "?" + strings.raw[i + 1];
  }

  return () => {
    const stmt = client.prepare(queryWithPlaceholders);
    const trimmedQuery = queryWithPlaceholders.trim().toUpperCase();

    if (trimmedQuery.startsWith("select")) {
      return stmt.all(...interpolations);
    } else {
      return stmt.run(...interpolations);
    }
  };
}

export const exec = (func: () => any): any => {
  return func();
}
