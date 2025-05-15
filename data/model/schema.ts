import { commit } from "../client/commit.ts";
import { channelsTableSql } from "./channels.ts";
import { eventsTableSql } from "./events.ts";
import { spacesTableSql } from "./spaces.ts";
import { usersTableSql } from "./users.ts";

export const setSchema = () =>
  commit(
    spacesTableSql,
    channelsTableSql,
    usersTableSql,
    eventsTableSql,
  );
