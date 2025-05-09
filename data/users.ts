import { exec, sql } from "./client.ts";

exec(
  sql`
    create table if not exists users (
      id integer primary key not null,
      name text not null
    )
  `,
);

export interface BottUser {
  id: number;
  name: string;
}

export const getUsers = (...ids: number[]): BottUser[] =>
  exec(
    sql`select * from users where id in (${ids})`,
  );

export const addUsers = (...users: BottUser[]): boolean => {
  try {
    exec(
      sql`
        insert into users
        (id, name)
        values ${users.map((user) => sql`(${user.id}, ${user.name})`)}`,
    );
    return true;
  } catch (_) {
    return false;
  }
};
