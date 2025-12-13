/**
 * This file is part of Bott.
 *
 * This project is dual-licensed:
 * - Non-commercial use: AGPLv3 (see LICENSE file for full text).
 * - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
 *
 * Copyright (C) 2025 DanielLaCos.se
 */

-- =============================================================================
-- Database Schema - Organized by dependency order for maximum compatibility
-- Tables are created in order: independent tables first, then dependent tables
-- This structure minimizes errors when running against an existing database
-- =============================================================================

-- Level 0: Independent base tables (no foreign key dependencies)
-- These can be created in any order

create table if not exists spaces (
  id varchar(36) primary key not null,
  name text not null,
  description text
);

create table if not exists users (
  id varchar(36) primary key not null,
  name text not null
);

create table if not exists files (
  id varchar(36) primary key not null,
  type varchar(64), -- mime type
  path text not null
);

-- Level 1: Tables that depend only on Level 0 tables

create table if not exists channels (
  id varchar(36) primary key not null,
  space_id varchar(36),
  name text not null,
  description text,
  config text,
  foreign key(space_id) references spaces(id)
);

-- Level 2: Tables that depend on Level 0 and Level 1 tables

create table if not exists events (
  id varchar(36) primary key not null,
  type varchar(16) not null,
  details text,
  parent_id varchar(36),
  channel_id varchar(36),
  user_id varchar(36),
  created_at datetime not null,
  last_processed_at datetime,
  foreign key(parent_id) references events(id),
  foreign key(channel_id) references channels(id),
  foreign key(user_id) references users(id)
);

-- Level 3: Tables that depend on Level 0 and Level 2 tables

create table if not exists attachments (
  id varchar(36) primary key not null,
  source_url text not null,
  raw_file_id varchar(36),
  compressed_file_id varchar(36),
  parent_id varchar(36),
  foreign key(parent_id) references events(id),
  foreign key(raw_file_id) references files(id),
  foreign key(compressed_file_id) references files(id)
);
