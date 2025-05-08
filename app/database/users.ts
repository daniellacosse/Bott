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
    sql`select * from users where id in (${ids.join(", ")})`
  );

export const addUsers = (...users: User[]): boolean => {
  try {
    exec(
      sql`
        insert into users
        (id, name)
        values (${users.map(u => [u.id, u.name]).join(", ")})
      `
    );
    return true;
  } catch (_) {
    return false;
  }
};
