-- Create the event_teams table to store team listings for events
create table if not exists public.event_teams (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  event_id uuid not null,
  name text not null,
  description text,
  contact_email text,
  constraint event_teams_pkey primary key (id),
  constraint fk_event_team foreign key (event_id) references public.events(id) on delete cascade
);

alter table public.event_teams enable row level security;

create policy "Public can select teams"
on public.event_teams
for select
to public
using (true);

create policy "Authenticated can insert teams"
on public.event_teams
for insert
to authenticated
with check (auth.role() = 'authenticated');

create index if not exists idx_event_teams_event_id on public.event_teams (event_id);
