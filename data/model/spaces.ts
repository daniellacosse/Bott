import { sql } from "../database/sql.ts";
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

export const getAddSpacesSql = (...spaces: BottSpace[]) => {
  if (!spaces.length) {
    return;
  }

  const values = spaces.map((space) =>
    sql`(${space.id}, ${space.name}, ${space.description})`
  );

  return sql`
    insert into spaces (id, name, description)
    values ${values} on conflict(id) 
    do update set
      name = excluded.name,
      description = excluded.description
  `;
};
