import { sql, exec } from "./client.ts";

export interface User {
  id: number;
  name: string;
}

exec(
  sql`
    create table if not exists users (
      id integer primary key not null,
      name text not null
    )
  `
);

export const getUsers = (...ids: number[]): User[] =>
  exec(
    sql`select * from users where id in (${ids})`
  );

export const addUsers = (...users: User[]): boolean => {
  try {
    exec(
      sql`
        insert into users
        (id, name)
        values ${users.map((user) => sql`(${user.id}, ${user.name})`)}`
    );
    return true;
  } catch (_) {
    return false;
  }
};
