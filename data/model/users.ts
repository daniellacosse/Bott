import { commit } from "../client/commit.ts";
import { sql } from "../client/sql.ts";

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
  const values = users.map((user) => sql`(${user.id}, ${user.name})`);

  return sql`
    insert into users (id, name)
    values ${values}
    on conflict(id) do update set
      name = excluded.name
  `;
};

export const addUsers = (...users: BottUser[]) => {
  return commit(getAddUsersSql(...users));
};
