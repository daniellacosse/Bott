import { exec, sql } from "../client.ts";
import type { BottEvent } from "./events.ts";

exec(
  sql`
    create table if not exists channels (
      id integer primary key not null,
      name text not null,
      description text,
      config text
    )
  `,
);

export interface BottChannel {
  id: number;
  name: string;
  description?: string;
  // Subobject stored as JSON for flexibility
  config?: {
    isActive: boolean;
  };
}

export const getChannels = (...ids: number[]): BottChannel[] => {
  const result = exec(
    sql`select * from channels where id in (${ids})`,
  );

  return result.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    config: JSON.parse(row.config),
  }));
};

export const getChannelHistory = (id: number): BottEvent[] =>
  exec(
    sql`select * from events where channel_id = ${id} order by timestamp desc`,
  );

export const addChannels = (...channels: BottChannel[]): boolean => {
  try {
    exec(
      sql`
        insert into channels
        (id, name, description, config)
        values ${
        channels.map((channel) =>
          sql`(${channel.id}, ${channel.name ?? null}, ${
            channel.description ?? null
          }, ${JSON.stringify(channel.config ?? null)})`
        )
      } on conflict update
      `,
    );
    return true;
  } catch (_) {
    return false;
  }
};
