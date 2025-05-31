create table if not exists spaces (
  id varchar(36) primary key not null,
  name text not null,
  description text
)

create table if not exists channels (
  id varchar(36) primary key not null,
  space_id varchar(36),
  name text not null,
  description text,
  config text,
  foreign key(space_id) references spaces(id)
)

create table if not exists users (
  id varchar(36) primary key not null,
  name text not null
)

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
)

create table if not exists assets (
  id varchar(36) primary key not null,
  type text not null,
  path text unique not null,
  parent_id varchar(36),
  parent_type text
)
