import { commit } from "../client/commit.ts";
import { sql } from "../client/sql.ts";
import { type BottSpace, getAddSpacesSql } from "./spaces.ts";

export interface BottChannel {
  id: string;
  name: string;
  space: BottSpace;
  description?: string;
  // Subobject stored as JSON for flexibility
  config?: {
    isQuiet: boolean;
  };
}

export const channelsTableSql = sql`
  create table if not exists channels (
    id varchar(36) primary key not null,
    space_id varchar(36),
    name text not null,
    description text,
    config text,
    foreign key(space_id) references spaces(id)
  )
`;

export const addChannels = (...channels: BottChannel[]) => {
  const spaces = [];

  for (const channel of channels) {
    spaces.push(channel.space);
  }

  return commit(
    getAddSpacesSql(...spaces),
    getAddChannelsSql(...channels),
  );
};

export const getAddChannelsSql = (
  ...channels: BottChannel[]
) => {
  const values = channels.map((channel) =>
    sql`(${channel.id}, ${channel.space.id}, ${channel.name ?? null}, ${
      channel.description ?? null
    }, ${JSON.stringify(channel.config ?? null)})`
  );

  return sql`
    insert into channels (id, space_id, name, description, config)
    values ${values} 
    on conflict(id) do update set
      space_id = excluded.space_id,
      name = excluded.name,
      description = excluded.description,
      config = excluded.config
  `;
};

// export const getChannelHistory = (channelId: number): BottEvent[] => {};
