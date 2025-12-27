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
  origin_id varchar(36),
  name text not null,
  description text
);

create table if not exists channels (
  id varchar(36) primary key not null,
  origin_id varchar(36),
  space_id varchar(36),
  name text not null,
  description text,
  config text,
  foreign key(space_id) references spaces(id)
);

create table if not exists users (
  id varchar(36) primary key not null,
  origin_id varchar(36),
  name text not null
);
