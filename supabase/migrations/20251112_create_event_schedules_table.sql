-- Create the event_schedules table to store schedule items for events
create table if not exists public.event_schedules (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  event_id uuid not null,
  start_at timestamp with time zone,
  title text not null,
  description text,
  constraint event_schedules_pkey primary key (id),
  constraint fk_event_schedule foreign key (event_id) references public.events(id) on delete cascade
);

alter table public.event_schedules enable row level security;
create policy "Public can select schedules"
on public.event_schedules
for select
to public
using (true);

create policy "Authenticated can insert schedules"
on public.event_schedules
for insert
to authenticated
with check (auth.role() = 'authenticated');

create index if not exists idx_event_schedules_event_id on public.event_schedules (event_id);
