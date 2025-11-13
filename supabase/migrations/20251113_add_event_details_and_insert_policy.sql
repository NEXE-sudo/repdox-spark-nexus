-- Add a JSONB `details` column to store extended event metadata
alter table if exists public.events
add column if not exists details jsonb default '{}'::jsonb;

-- Ensure RLS is enabled (should already be enabled in earlier migration)
alter table if exists public.events enable row level security;

-- Allow authenticated users to insert events (adjust check as needed)
-- Postgres does not support IF NOT EXISTS on CREATE POLICY. Drop then create to be idempotent.
drop policy if exists "Authenticated can insert events" on public.events;
create policy "Authenticated can insert events"
on public.events
for insert
to authenticated
with check (auth.role() = 'authenticated');

-- Optionally allow authenticated users to update their events in future.
-- (Left intentionally minimal for now.)
