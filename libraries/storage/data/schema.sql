/**
 * This file is part of Bott.
 *
 * This project is dual-licensed:
 * - Non-commercial use: AGPLv3 (see LICENSE file for full text).
 * - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
 *
 * Copyright (C) 2025 DanielLaCos.se
 */

create table if not exists spaces (
  id varchar(36) primary key not null,
  name text not null,
  description text
);

create table if not exists channels (
  id varchar(36) primary key not null,
  space_id varchar(36),
  name text not null,
  description text,
  config text,
  foreign key(space_id) references spaces(id)
);

create table if not exists users (
  id varchar(36) primary key not null,
  name text not null,
  display_name text
);

create table if not exists events (
  id varchar(36) primary key not null,
  type varchar(16) not null,
  details text,
  parent_id varchar(36),
  channel_id varchar(36),
  user_id varchar(36),
  timestamp datetime not null,
  foreign key(parent_id) references events(id),
  foreign key(channel_id) references channels(id),
  foreign key(user_id) references users(id)
);

create table if not exists files (
  id varchar(36) primary key not null,
  source_url text,
  parent_id varchar(36),
  foreign key(parent_id) references events(id)
);
