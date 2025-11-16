-- Create the event_registrations table to store attendees/registrations for events
create table if not exists public.event_registrations (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  event_id uuid not null,
  user_id uuid,
  name text,
  email text,
  phone text,
  message text,
  status text default 'registered',
  constraint event_registrations_pkey primary key (id),
  constraint fk_event foreign key (event_id) references public.events(id) on delete cascade
);

-- Enable RLS
alter table public.event_registrations enable row level security;

-- Allow anyone to insert a registration (adjust as needed for your security model)
create policy "Allow inserts for registrations"
on public.event_registrations
for insert
to public
with check (true);

-- Allow users to select their own registrations or public to count
create policy "Public can select registrations"
on public.event_registrations
for select
to public
using (true);

-- Index for fast lookups by event
create index if not exists idx_event_registrations_event_id on public.event_registrations (event_id);
