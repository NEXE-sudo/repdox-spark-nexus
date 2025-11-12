-- Update RLS policies: restrict inserts to authenticated users and tidy up registration policy

-- For events: only authenticated users may insert
drop policy if exists "Authenticated can insert events" on public.events;
create policy "Authenticated can insert events"
on public.events
for insert
to authenticated
with check (auth.role() = 'authenticated');

-- For event_registrations: drop permissive policy and require authenticated inserts
drop policy if exists "Allow inserts for registrations" on public.event_registrations;
create policy "Authenticated can insert registrations"
on public.event_registrations
for insert
to authenticated
with check (auth.role() = 'authenticated');

-- Allow public select for registrations (counts etc.)
drop policy if exists "Public can select registrations" on public.event_registrations;
create policy "Public can select registrations"
on public.event_registrations
for select
to public
using (true);

-- Ensure schedules and teams have reasonable policies (created above in their migrations), but be explicit
drop policy if exists "Public can select schedules" on public.event_schedules;
create policy "Public can select schedules"
on public.event_schedules
for select
to public
using (true);

drop policy if exists "Public can select teams" on public.event_teams;
create policy "Public can select teams"
on public.event_teams
for select
to public
using (true);
