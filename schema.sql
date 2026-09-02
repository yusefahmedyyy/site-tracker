-- Run this once in Supabase → SQL Editor

create table if not exists events (
  id bigint generated always as identity primary key,
  site text not null,
  event_name text not null,
  session_id text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists events_site_idx on events (site);
create index if not exists events_event_name_idx on events (event_name);
create index if not exists events_created_at_idx on events (created_at);

-- Row Level Security: allow inserts from anyone (the tracking script uses the
-- public anon key), but block reads/updates/deletes from that same key.
-- The dashboard reads using the service_role key instead, which bypasses RLS.
alter table events enable row level security;

create policy "allow anon inserts" on events
  for insert
  to anon
  with check (true);
