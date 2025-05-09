import { exec, sql } from "./client.ts";

exec(
  sql`
    create table if not exists channels (
      id integer primary key not null,
      name text not null,
      description text
    )
  `,
);

export interface BottChannel {
  id: number;
  name: string;
  description?: string;
}

export const getChannels = (...ids: number[]): BottChannel[] =>
  exec(
    sql`select * from channels where id in (${ids})`,
  );

export const addChannels = (...channels: BottChannel[]): boolean => {
  try {
    exec(
      sql`
        insert into channels
        (id, name, description)
        values ${
        channels.map((channel) =>
          sql`(${channel.id}, ${channel.name ?? null}, ${
            channel.description ?? null
          })`
        )
      }
      `,
    );
    return true;
  } catch (_) {
    return false;
  }
};
