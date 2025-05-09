import { exec, sql } from "./client.ts";

export interface Channel {
  id: number;
  name?: string;
  description?: string;
}

exec(
  sql`
    create table if not exists channels (
      id integer primary key not null,
      name text,
      description text
    )
  `
);

export const getChannels = (...ids: number[]): Channel[] =>
  exec(
    sql`select * from channels where id in (${ids})`
  );

export const addChannels = (...channels: Channel[]): boolean => {
  try {
    exec(
      sql`
        insert into channels
        (id, name, description)
        values ${channels.map((channel) => sql`(${channel.id}, ${channel.name ?? null}, ${channel.description ?? null})`)}
      `
    );
    return true;
  } catch (_) {
    return false;
  }
};
