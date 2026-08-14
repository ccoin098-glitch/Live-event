-- Additive: mark events the user has opened.
-- Run in Supabase SQL Editor if you already have the events table.

alter table events
  add column if not exists is_viewed boolean not null default false;

create index if not exists events_is_viewed_idx on events (is_viewed);
