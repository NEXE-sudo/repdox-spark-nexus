-- ============================================================================
-- SUPABASE MIGRATIONS - Run all of this in SQL Editor
-- ============================================================================
-- This script contains all database migrations needed for the events system.
-- Copy the ENTIRE contents and paste into your Supabase SQL Editor, then click "Run".
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Create events table with enums
-- ============================================================================

-- Create enum for event types
CREATE TYPE public.event_type AS ENUM ('Hackathon', 'Workshop', 'MUN', 'Gaming');

-- Create enum for event format
CREATE TYPE public.event_format AS ENUM ('Online', 'Offline', 'Hybrid');

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type public.event_type NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  format public.event_format NOT NULL,
  short_blurb TEXT NOT NULL,
  long_description TEXT,
  overview TEXT,
  schedule JSONB,
  rules TEXT,
  prizes JSONB,
  faqs JSONB,
  organisers JSONB,
  sponsors JSONB,
  image_url TEXT,
  tags TEXT[],
  registration_link TEXT,
  discord_invite TEXT,
  instagram_handle TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active events
CREATE POLICY "Anyone can read active events"
  ON public.events
  FOR SELECT
  USING (is_active = true);

-- Policy: Authenticated users can manage events
CREATE POLICY "Admins can manage all events"
  ON public.events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert seed data
INSERT INTO public.events (
  title, slug, type, start_at, end_at, registration_deadline, location, format,
  short_blurb, long_description, overview, image_url, tags, discord_invite, instagram_handle, is_active
) VALUES 
(
  'CodeCraft Hackathon 2025',
  'codecraft-hackathon-2025',
  'Hackathon',
  '2025-03-15 09:00:00+05:30',
  '2025-03-17 18:00:00+05:30',
  '2025-03-10 23:59:00+05:30',
  'Tech Hub, Mumbai',
  'Offline',
  '48-hour coding marathon building solutions for social impact. Form teams, ideate, and ship innovative projects.',
  'Join us for an intense 48-hour hackathon where teams of passionate developers, designers, and innovators come together to build solutions for real-world social challenges. Work alongside mentors from top tech companies, win amazing prizes, and make lasting connections.',
  'CodeCraft is Repdox''s flagship hackathon event bringing together 200+ participants from across the country. This year''s theme focuses on technology for social good - build solutions that make a real difference.',
  '/assets/event-hackathon.jpg',
  ARRAY['Tech', 'Innovation', 'Prizes'],
  'https://discord.gg/repdox',
  '@repdox',
  true
),
(
  'Global Youth MUN',
  'global-youth-mun',
  'MUN',
  '2025-04-08 10:00:00+05:30',
  '2025-04-10 17:00:00+05:30',
  '2025-04-03 23:59:00+05:30',
  'Convention Center, Delhi',
  'Offline',
  'Debate international policies, represent nations, and develop diplomatic skills in this prestigious Model UN conference.',
  'Experience high-level diplomatic simulation across multiple committees including UNSC, UNGA, and crisis committees. Sharpen your public speaking, negotiation, and critical thinking skills while engaging with pressing global issues.',
  'Our annual MUN conference brings together 300+ delegates for three days of intense debate and diplomacy.',
  '/assets/event-mun.jpg',
  ARRAY['Debate', 'Leadership', 'Diplomacy'],
  'https://discord.gg/repdox',
  '@repdox',
  true
),
(
  'Esports Championship',
  'esports-championship',
  'Gaming',
  '2025-05-20 14:00:00+05:30',
  '2025-05-21 22:00:00+05:30',
  '2025-05-15 23:59:00+05:30',
  'Gaming Arena, Bangalore',
  'Offline',
  'Compete in popular games, showcase your skills, and win amazing prizes in our multi-game tournament.',
  'Battle it out across multiple esports titles including Valorant, CS2, and League of Legends. Professional casting, live audience, and substantial prize pools await the champions.',
  'Our biggest gaming event featuring tournaments across multiple titles with professional production quality.',
  '/assets/event-gaming.jpg',
  ARRAY['Gaming', 'Competition', 'Esports'],
  'https://discord.gg/repdox',
  '@repdox',
  true
),
(
  'AI & ML Workshop',
  'ai-ml-workshop',
  'Workshop',
  '2025-06-05 10:00:00+05:30',
  '2025-06-05 17:00:00+05:30',
  '2025-06-01 23:59:00+05:30',
  'Online',
  'Online',
  'Learn cutting-edge machine learning techniques from industry experts. Hands-on projects included.',
  'Deep dive into modern AI/ML techniques with hands-on coding sessions. Cover neural networks, computer vision, NLP, and deploy your first ML model. Perfect for beginners and intermediate learners.',
  'A comprehensive one-day workshop covering the fundamentals and practical applications of AI and Machine Learning.',
  '/assets/event-workshop.jpg',
  ARRAY['AI', 'Learning', 'Career'],
  'https://discord.gg/repdox',
  '@repdox',
  true
);

-- ============================================================================
-- MIGRATION 2: Create user_profiles table
-- ============================================================================

CREATE TABLE "public"."user_profiles" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "full_name" text,
    "bio" text,
    "avatar_url" text,
    "phone" text,
    "location" text,
    "website" text,
    "company" text,
    "job_title" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    constraint "user_profiles_pkey" primary key ("id"),
    constraint "user_profiles_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on delete cascade,
    constraint "user_profiles_user_id_key" unique ("user_id")
);

-- Enable RLS
alter table "public"."user_profiles" enable row level security;

-- Anyone can read public profile info (avatar_url, full_name)
create policy "Anyone can read profiles"
on "public"."user_profiles"
for select
using (true);

-- Users can read their own profile
create policy "Users can read own profile"
on "public"."user_profiles"
for select
to authenticated
using (auth.uid() = user_id);

-- Users can update their own profile
create policy "Users can update own profile"
on "public"."user_profiles"
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Users can insert their own profile
create policy "Users can insert own profile"
on "public"."user_profiles"
for insert
to authenticated
with check (auth.uid() = user_id);

-- Create trigger to insert profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Run trigger on auth.users insert
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create index on user_id for faster queries
create index "user_profiles_user_id_idx" on "public"."user_profiles" ("user_id");

-- ============================================================================
-- MIGRATION 3: Create event_registrations table
-- ============================================================================

create table if not exists public.event_registrations (
  id uuid not null default uuid_generate_v4(),
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

-- Allow anyone to insert a registration
create policy "Allow inserts for registrations"
on public.event_registrations
for insert
to public
with check (true);

-- Allow users to select registrations
create policy "Public can select registrations"
on public.event_registrations
for select
to public
using (true);

-- Index for fast lookups by event
create index if not exists idx_event_registrations_event_id on public.event_registrations (event_id);

-- ============================================================================
-- MIGRATION 4: Create event_schedules table
-- ============================================================================

create table if not exists public.event_schedules (
  id uuid not null default uuid_generate_v4(),
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

-- ============================================================================
-- MIGRATION 5: Create event_teams table
-- ============================================================================

create table if not exists public.event_teams (
  id uuid not null default uuid_generate_v4(),
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

-- ============================================================================
-- MIGRATION 6: Update RLS policies for stricter authentication
-- ============================================================================

drop policy if exists "Admins can manage all events" on public.events;
create policy "Authenticated can insert events"
on public.events
for insert
to authenticated
with check (auth.role() = 'authenticated');

drop policy if exists "Allow inserts for registrations" on public.event_registrations;
create policy "Authenticated can insert registrations"
on public.event_registrations
for insert
to authenticated
with check (auth.role() = 'authenticated');

-- ============================================================================
-- DONE! All migrations have been applied.
-- ============================================================================
