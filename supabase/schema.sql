-- Lockal Events — multi-city schema RESET
-- Paste the FULL file into Supabase SQL Editor and Run.
-- WARNING: deletes existing places / profile / events / ingest_runs data.

-- Drop tables first (also removes RLS policies). Do NOT drop policies
-- on tables that may not exist yet — that aborts the whole script.
drop table if exists events cascade;
drop table if exists ingest_runs cascade;
drop table if exists user_profile cascade;
drop table if exists places cascade;

create table places (
  id text primary key,
  label text not null,
  city_or_address text not null,
  lat double precision not null,
  lng double precision not null,
  country_code text not null default 'NL',
  radius_km double precision not null default 25,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index places_last_used_idx on places (last_used_at desc);

create table user_profile (
  id text primary key default 'singleton',
  active_place_id text references places(id) on delete set null,
  preferences_text text not null default '',
  preference_tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table events (
  id text primary key,
  place_id text not null references places(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'Other',
  venue text not null default '',
  address text not null default '',
  lat double precision,
  lng double precision,
  distance_km double precision,
  starts_at timestamptz not null,
  ends_at timestamptz,
  source text not null,
  source_url text,
  external_id text,
  image_url text,
  raw_payload jsonb,
  is_going boolean not null default false,
  is_viewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, source, external_id)
);

create index events_starts_at_idx on events (starts_at);
create index events_category_idx on events (category);
create index events_is_going_idx on events (is_going);
create index events_is_viewed_idx on events (is_viewed);
create index events_place_id_idx on events (place_id);

create table ingest_runs (
  id text primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  events_found integer not null default 0,
  error text
);

insert into user_profile (id)
values ('singleton');

alter table places enable row level security;
alter table user_profile enable row level security;
alter table events enable row level security;
alter table ingest_runs enable row level security;

create policy "anon all places" on places
  for all using (true) with check (true);

create policy "anon all user_profile" on user_profile
  for all using (true) with check (true);

create policy "anon all events" on events
  for all using (true) with check (true);

create policy "anon all ingest_runs" on ingest_runs
  for all using (true) with check (true);
