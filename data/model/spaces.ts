import { commit } from "../client/commit.ts";
import { sql } from "../client/sql.ts";
import type { BottChannel } from "./channels.ts";

export interface BottSpace {
  id: string;
  name: string;
  description?: string;
  channels?: BottChannel[];
}

export const spacesTableSql = sql`
  create table if not exists spaces (
    id varchar(36) primary key not null,
    name text not null,
    description text
  )
`;

export const addSpaces = (...spaces: BottSpace[]) => {
  return commit(getAddSpacesSql(...spaces));
};

export const getAddSpacesSql = (...spaces: BottSpace[]) => {
  const values = spaces.map((space) =>
    sql`(${space.id}, ${space.name}, ${space.description ?? null})`
  );

  return sql`
    insert into spaces (id, name, description)
    values ${values} on conflict(id) 
    do update set
      name = excluded.name,
      description = excluded.description
  `;
};
