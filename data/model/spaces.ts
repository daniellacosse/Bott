import { exec, sql } from "../client.ts";
import type { BottChannel } from "./channels.ts";

exec(
  sql`
    create table if not exists spaces (
      id integer primary key not null,
      name text not null,
      description text
    )
  `,
);

export interface BottSpace {
  id: number;
  name: string;
  description: string;
  channels: BottChannel[];
}

export const addSpaces = (...spaces: BottSpace[]): boolean => {
  return exec(
    sql`
      insert into spaces (
        id,
        name,
        description
      ) values ${
      spaces.map((space) =>
        sql`(${space.id}, ${space.name}, ${space.description})`
      )
    }
    `,
  );
};
