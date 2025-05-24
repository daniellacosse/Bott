import { sql } from "../database/sql.ts";

export interface BottUser {
  id: string;
  name: string;
}

export const usersTableSql = sql`
  create table if not exists users (
    id varchar(36) primary key not null,
    name text not null
  )
`;

export const getAddUsersSql = (...users: BottUser[]) => {
  if (!users.length) {
    return;
  }

  const values = users.map((user) => sql`(${user.id}, ${user.name})`);

  return sql`
    insert into users (id, name)
    values ${values}
    on conflict(id) do update set
      name = excluded.name
  `;
};
