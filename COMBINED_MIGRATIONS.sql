-- ============================================================================
-- COMBINED SUPABASE MIGRATIONS
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- MIGRATION: 20251109083651_1e0e9c6d-baf8-421f-a925-3e61ea7a0085.sql
-- ============================================================================
-- Create enum for event types
DROP TYPE IF EXISTS public.event_type CASCADE;
CREATE TYPE public.event_type AS ENUM ('Hackathon', 'Workshop', 'MUN', 'Gaming');

-- Create enum for event format
DROP TYPE IF EXISTS public.event_format CASCADE;
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

-- Policy: Authenticated users with admin role can do everything (we'll add role system later)
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
-- MIGRATION: 20251109083719_735c8f42-2946-4b14-8dcc-fb8888d25690.sql
-- ============================================================================
-- Fix security warning: Set search_path for handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
-- ============================================================================
-- MIGRATION: 20251109_create_events_table.sql
-- ============================================================================
-- Enable pgcrypto extension for UUID functions
create extension if not exists "pgcrypto";

-- Create the events table
create table "public"."events" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "title" text not null,
    "slug" text not null,
    "type" text not null,
    "format" text not null,
    "start_at" timestamp with time zone not null,
    "location" text not null,
    "short_blurb" text,
    "image_url" text,
    "tags" text[] default '{}',
    "is_active" boolean default true,
    constraint "events_pkey" primary key ("id"),
    constraint "events_slug_key" unique ("slug")
);

-- Add some sample events
insert into "public"."events" ("title", "slug", "type", "format", "start_at", "location", "short_blurb", "image_url", "tags", "is_active") 
values 
(
    'Hackathon 2025: AI Revolution',
    'hackathon-2025-ai-revolution',
    'Hackathon',
    'In-Person',
    '2025-12-01 09:00:00+00',
    'Tech Hub, Silicon Valley',
    'Join us for a 48-hour hackathon focused on AI and machine learning innovations. Build the future!',
    'hackathon-2025.jpg',
    ARRAY['AI', 'Machine Learning', 'Innovation'],
    true
),
(
    'Model UN Conference: Climate Action',
    'mun-climate-action-2025',
    'Model UN',
    'Hybrid',
    '2025-11-15 10:00:00+00',
    'Global Conference Center',
    'Tackle climate change challenges in this Model UN conference. Represent nations, debate solutions.',
    'mun-climate.jpg',
    ARRAY['Climate', 'Diplomacy', 'Policy'],
    true
),
(
    'Gaming Tournament: Esports Championship',
    'esports-championship-2025',
    'Gaming',
    'Online',
    '2025-11-30 15:00:00+00',
    'Virtual Arena',
    'Compete in our annual esports championship. Multiple games, amazing prizes!',
    'esports-tournament.jpg',
    ARRAY['Gaming', 'Esports', 'Competition'],
    true
),
(
    'Tech Workshop: Web3 Development',
    'web3-workshop-2025',
    'Workshop',
    'In-Person',
    '2025-12-10 13:00:00+00',
    'Innovation Center',
    'Learn blockchain development and Web3 technologies in this hands-on workshop.',
    'web3-workshop.jpg',
    ARRAY['Blockchain', 'Web3', 'Development'],
    true
),
(
    'Startup Pitch Competition',
    'startup-pitch-2025',
    'Competition',
    'Hybrid',
    '2025-12-15 14:00:00+00',
    'Entrepreneurship Hub',
    'Present your startup idea to investors and win funding opportunities!',
    'startup-pitch.jpg',
    ARRAY['Startup', 'Business', 'Pitch'],
    true
),
(
    'Design Thinking Workshop',
    'design-thinking-2025',
    'Workshop',
    'In-Person',
    '2025-12-05 11:00:00+00',
    'Design Studio',
    'Master the design thinking process in this interactive workshop.',
    'design-workshop.jpg',
    ARRAY['Design', 'Innovation', 'Creativity'],
    true
);

-- Enable RLS (Row Level Security)
alter table "public"."events" enable row level security;

-- Create policy to allow anyone to read active events
create policy "Anyone can read active events"
on "public"."events"
for select
to public
using (is_active = true);
-- ============================================================================
-- MIGRATION: 20251112_create_event_registrations_table.sql
-- ============================================================================
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

-- ============================================================================
-- MIGRATION: 20251112_create_event_schedules_table.sql
-- ============================================================================
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

-- ============================================================================
-- MIGRATION: 20251112_create_event_teams_table.sql
-- ============================================================================
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

-- ============================================================================
-- MIGRATION: 20251112_create_user_profiles_table.sql
-- ============================================================================
-- Create user_profiles table linked to auth.users
create table "public"."user_profiles" (
    "id" uuid not null default gen_random_uuid(),
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
-- MIGRATION: 20251112_update_rls_policies.sql
-- ============================================================================
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

-- ============================================================================
-- MIGRATION: 20251113_add_created_by_to_events.sql
-- ============================================================================
-- Add created_by column to events and create RLS policy to ensure only creators can insert
ALTER TABLE IF EXISTS public.events
ADD COLUMN IF NOT EXISTS created_by uuid;

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present, then create a policy that requires the inserting user's id to match created_by
DROP POLICY IF EXISTS "Authenticated can insert events" ON public.events;
CREATE POLICY "Authenticated can insert events"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Allow authenticated users to manage events they created
DROP POLICY IF EXISTS "Owners can manage their events" ON public.events;
CREATE POLICY "Owners can manage their events"
  ON public.events
  FOR ALL
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ============================================================================
-- MIGRATION: 20251113_add_event_details_and_insert_policy.sql
-- ============================================================================
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

-- ============================================================================
-- MIGRATION: 20251113_add_storage_rls_policies.sql
-- ============================================================================
-- Storage RLS policies for avatars and events buckets
-- Note: These policies are typically managed via the Supabase dashboard (Storage > Policies)
-- or via the management API, not via raw migrations (storage.objects is a system table).
-- 
-- To apply these policies manually via the Supabase dashboard:
-- 1. Go to Storage > Buckets > avatars > Policies
-- 2. Create INSERT policy "Users can upload own avatars"
--    - Allowed roles: authenticated
--    - MIME type: any
--    - Search path: avatars/
--    - Condition (optional): none
-- 3. Create SELECT policy "Users can read avatars"
--    - Allowed roles: authenticated
--    - Condition: none (allow all)
-- 4. Repeat for events bucket with path "events/"
--
-- Alternatively, use the Supabase CLI:
--   supabase postgres execute --file supabase/migrations/20251113_setup_storage_buckets.sql
--
-- For now, this is a placeholder migration. The actual RLS setup must be done via:
-- - Supabase Dashboard (recommended for simplicity), or
-- - Supabase management API with proper admin credentials

-- This migration intentionally does not execute storage.objects modifications
-- since those require ownership permissions not available in standard migrations.
-- See README or deployment docs for manual storage policy setup steps.

-- ============================================================================
-- MIGRATION: 20251113_normalize_event_image_urls.sql
-- ============================================================================
-- Normalize existing events.image_url values to store only the storage object path
-- This converts values that are full URLs (public URLs or previously stored signed URLs)
-- into the storage path format 'events/<filename>' where possible. Review before running.

BEGIN;

-- Example strategy: if image_url contains '/storage/v1/object/public/events/', extract the suffix
UPDATE public.events
SET image_url = regexp_replace(image_url, '^.*?/storage/v1/object/public/events/', 'events/')
WHERE image_url IS NOT NULL
  AND image_url LIKE '%/storage/v1/object/public/events/%';

-- If image_url contains the bucket prefix 'events/' already, no-op; keep those rows.

-- If image_url contains a signed URL with 'events/' anywhere, attempt to extract the path
UPDATE public.events
SET image_url = substring(image_url FROM 'events/[^\?\n\r]+')
WHERE image_url IS NOT NULL
  AND image_url ~ 'events/[^\?\n\r]+';

COMMIT;

-- ============================================================================
-- MIGRATION: 20251114_add_fk_community_posts.sql
-- ============================================================================
-- Add foreign key constraint for community_posts -> user_profiles
-- This enables Supabase relationship queries like user_profile:user_id
ALTER TABLE community_posts
ADD CONSTRAINT fk_community_posts_user_id 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(user_id) 
ON DELETE CASCADE;

-- Add foreign key constraint for posts_comments -> user_profiles
ALTER TABLE posts_comments
ADD CONSTRAINT fk_posts_comments_user_id 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(user_id) 
ON DELETE CASCADE;

-- Add foreign key constraint for posts_comments -> community_posts
ALTER TABLE posts_comments
ADD CONSTRAINT fk_posts_comments_post_id 
FOREIGN KEY (post_id) 
REFERENCES community_posts(id) 
ON DELETE CASCADE;

-- ============================================================================
-- MIGRATION: 20251114_add_handle_to_profiles.sql
-- ============================================================================
-- Add handle (unique username) field to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS handle VARCHAR(255) UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_handle ON user_profiles(handle);

-- ============================================================================
-- MIGRATION: 20251114_add_likes_to_comments.sql
-- ============================================================================
-- Migration: Add likes_count to posts_comments table
-- This allows comments to have the same like functionality as posts

-- Add likes_count column to posts_comments
ALTER TABLE posts_comments
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Create table for tracking comment likes (similar to user_post_likes)
CREATE TABLE IF NOT EXISTS user_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES posts_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, comment_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_comment_likes_user_id ON user_comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_comment_likes_comment_id ON user_comment_likes(comment_id);

-- Enable RLS
ALTER TABLE user_comment_likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_comment_likes
CREATE POLICY "Users can view all comment likes" ON user_comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can like comments" ON user_comment_likes
    FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Users can unlike their own comment likes" ON user_comment_likes
    FOR DELETE USING (auth.uid()::TEXT = user_id::TEXT);

-- Populate likes_count from existing comment_likes data if it exists
UPDATE posts_comments pc
SET likes_count = (
    SELECT COUNT(*) FROM comment_likes cl 
    WHERE cl.comment_id = pc.id
)
WHERE EXISTS (SELECT 1 FROM comment_likes WHERE comment_id = pc.id);

-- Copy existing likes from comment_likes to new user_comment_likes table
INSERT INTO user_comment_likes (user_id, comment_id, created_at)
SELECT user_id, comment_id, COALESCE(created_at, NOW())
FROM comment_likes
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION: 20251114_create_community_posts_table.sql
-- ============================================================================
-- Create community_posts table for user posts/updates
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);

-- Enable RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view posts
CREATE POLICY "Posts are viewable by everyone" ON community_posts
  FOR SELECT USING (true);

-- Policy: Users can create their own posts
CREATE POLICY "Users can create their own posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own posts
CREATE POLICY "Users can update their own posts" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own posts
CREATE POLICY "Users can delete their own posts" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- MIGRATION: 20251114_create_friendships_table.sql
-- ============================================================================
-- Create friendships table for friend requests, friendships, and blocks
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view friendships involving them
CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Policy: Users can create friendship requests
CREATE POLICY "Users can create friendship requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own friendship requests (accept/reject)
CREATE POLICY "Users can update their own friendships" ON friendships
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Policy: Users can delete their own friendships
CREATE POLICY "Users can delete their own friendships" ON friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================================================
-- MIGRATION: 20251114_extend_community_posts_features.sql
-- ============================================================================
-- Extend community_posts table with new features
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS images_urls TEXT[] DEFAULT '{}';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS gif_url TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS location JSONB;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS poll_id UUID;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE;

-- Create posts_comments table for comments
CREATE TABLE IF NOT EXISTS posts_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes continued
CREATE INDEX IF NOT EXISTS idx_posts_comments_user_id ON posts_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_polls_post_id ON polls(post_id);

-- Enable RLS
ALTER TABLE posts_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts_comments
CREATE POLICY "Posts comments are viewable by everyone" ON posts_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can comment on posts" ON posts_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON posts_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON posts_comments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for polls
CREATE POLICY "Polls are viewable by everyone" ON polls
  FOR SELECT USING (true);

CREATE POLICY "Users can create polls" ON polls
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- MIGRATION: 20251114_refactor_likes_system.sql
-- ============================================================================
-- Migration: Refactor likes system to use community_posts.likes_count directly
-- This removes dependency on posts_likes table

-- Step 1: Ensure likes_count column exists in community_posts
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Step 2: Ensure likes_count column exists in polls
ALTER TABLE polls
ADD COLUMN IF NOT EXISTS votes_count INTEGER DEFAULT 0;

-- Step 3: Create a junction table to track which users liked which posts
-- (We still need this for checking if a user liked a post)
CREATE TABLE IF NOT EXISTS user_post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Step 4: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_post_likes_user_id ON user_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_post_likes_post_id ON user_post_likes(post_id);

-- Step 5: Populate likes_count from existing posts_likes data if it exists
-- Only run if posts_likes table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_likes') THEN
        UPDATE community_posts cp
        SET likes_count = (
            SELECT COUNT(*) FROM posts_likes pl 
            WHERE pl.post_id = cp.id
        )
        WHERE EXISTS (SELECT 1 FROM posts_likes WHERE post_id = cp.id);
    END IF;
END $$;

-- Step 6: Copy existing likes from posts_likes to new user_post_likes table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_likes') THEN
        INSERT INTO user_post_likes (user_id, post_id, created_at)
        SELECT user_id, post_id, COALESCE(created_at, NOW())
        FROM posts_likes
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Step 7: Enable RLS on new tables
ALTER TABLE user_post_likes ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for user_post_likes
CREATE POLICY "Users can view all post likes" ON user_post_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON user_post_likes
    FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Users can unlike their own likes" ON user_post_likes
    FOR DELETE USING (auth.uid()::TEXT = user_id::TEXT);

-- ============================================================================
-- MIGRATION: 20251116_add_comprehensive_media_and_polls.sql
-- ============================================================================
-- Migration: Add comprehensive media, location, and enhanced poll support
-- This migration ensures posts and comments support images, GIFs, locations, and improved polls

-- ============================================================================
-- PART 1: Add media fields to posts_comments table
-- ============================================================================

-- Add media support to comments
ALTER TABLE posts_comments ADD COLUMN IF NOT EXISTS images_urls TEXT[] DEFAULT '{}';
ALTER TABLE posts_comments ADD COLUMN IF NOT EXISTS gif_url TEXT;
ALTER TABLE posts_comments ADD COLUMN IF NOT EXISTS location JSONB;

-- Create indexes for media columns in comments
CREATE INDEX IF NOT EXISTS idx_posts_comments_created_at ON posts_comments(created_at DESC);

-- ============================================================================
-- PART 2: Enhance polls table with additional features
-- ============================================================================

-- Add poll duration and expiration tracking
ALTER TABLE polls ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 1;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS duration_hours INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing polls with expiration times (default to 1 day)
UPDATE polls
SET 
  duration_days = 1,
  expires_at = created_at + INTERVAL '1 day',
  created_by_id = (
    SELECT user_id FROM community_posts WHERE id = polls.post_id LIMIT 1
  )
WHERE expires_at IS NULL;

-- ============================================================================
-- PART 3: Enhanced poll votes tracking with vote counts per option
-- (Skipped - poll_option_votes_count not used in application code)
-- ============================================================================

-- ============================================================================
-- PART 4: Storage bucket configuration for media files
-- ============================================================================

-- Create storage bucket for post images if it doesn't exist
-- Note: This is informational - actual bucket creation should be done via Supabase dashboard or admin API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true) 
-- ON CONFLICT DO NOTHING;

-- Create storage bucket for post GIFs
-- INSERT INTO storage.buckets (id, name, public) VALUES ('post-gifs', 'post-gifs', true) 
-- ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 5: Update RLS policies for comments with media
-- ============================================================================

-- Drop existing policies if they exist (to avoid duplicates)
DROP POLICY IF EXISTS "Posts comments are viewable by everyone" ON posts_comments;
DROP POLICY IF EXISTS "Users can comment on posts" ON posts_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON posts_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON posts_comments;

-- Recreate RLS Policies for posts_comments with media support
CREATE POLICY "Posts comments are viewable by everyone" ON posts_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can comment on posts" ON posts_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON posts_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON posts_comments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PART 6: Update RLS policies for polls with expiration
-- ============================================================================

-- Drop existing poll policies to recreate them
DROP POLICY IF EXISTS "Polls are viewable by everyone" ON polls;
DROP POLICY IF EXISTS "Users can create polls" ON polls;

-- Recreate RLS Policies for polls with duration support
CREATE POLICY "Polls are viewable by everyone" ON polls
  FOR SELECT USING (true);

CREATE POLICY "Users can create polls" ON polls
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own polls" ON polls
  FOR UPDATE USING (created_by_id = auth.uid());

-- ============================================================================
-- PART 7: RLS policies for polls with expiration support
-- ============================================================================



-- ============================================================================
-- PART 9-10: Validation and constraints
-- ============================================================================

-- Ensure images_urls array contains valid URLs
ALTER TABLE community_posts 
  ADD CONSTRAINT valid_image_urls CHECK (
    images_urls IS NULL OR array_length(images_urls, 1) IS NULL OR array_length(images_urls, 1) <= 10
  );

ALTER TABLE posts_comments 
  ADD CONSTRAINT valid_comment_image_urls CHECK (
    images_urls IS NULL OR array_length(images_urls, 1) IS NULL OR array_length(images_urls, 1) <= 4
  );

-- Ensure poll options are not empty
ALTER TABLE polls
  ADD CONSTRAINT valid_poll_options CHECK (
    options IS NOT NULL AND array_length(options, 1) > 1
  );

-- ============================================================================
-- PART 12: Create audit log for media uploads
-- ============================================================================

CREATE TABLE IF NOT EXISTS media_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'post', 'comment', 'profile'
  content_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL, -- 'image', 'gif', 'avatar'
  file_size_bytes BIGINT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for audit log
CREATE INDEX IF NOT EXISTS idx_media_audit_log_user_id ON media_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_media_audit_log_content_id ON media_audit_log(content_id);
CREATE INDEX IF NOT EXISTS idx_media_audit_log_uploaded_at ON media_audit_log(uploaded_at DESC);

-- Enable RLS for media audit log
ALTER TABLE media_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_audit_log
CREATE POLICY "Users can view their own media uploads" ON media_audit_log
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can log their media uploads" ON media_audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PART 13: Create summary view for post metadata
-- ============================================================================

CREATE OR REPLACE VIEW post_metadata AS
SELECT 
  cp.id,
  cp.user_id,
  cp.title,
  cp.content,
  cp.likes_count,
  cp.comments_count,
  cp.created_at,
  array_length(cp.images_urls, 1) AS image_count,
  cp.gif_url IS NOT NULL AS has_gif,
  cp.location IS NOT NULL AS has_location,
  cp.poll_id IS NOT NULL AS has_poll,
  cp.is_scheduled,
  cp.scheduled_at,
  (SELECT COUNT(*) FROM user_post_likes WHERE post_id = cp.id) AS actual_likes
FROM community_posts cp;

-- ============================================================================
-- PART 14: Create helper function to get formatted location
-- ============================================================================

CREATE OR REPLACE FUNCTION get_formatted_location(location_json JSONB)
RETURNS TEXT AS $$
BEGIN
  IF location_json IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return address if available, otherwise format coordinates
  IF location_json->>'address' IS NOT NULL THEN
    RETURN location_json->>'address';
  ELSE
    RETURN COALESCE(
      location_json->>'latitude'::TEXT || ', ' || location_json->>'longitude'::TEXT,
      NULL
    );
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Summary of Changes
-- ============================================================================
-- 1. Added media fields (images_urls, gif_url, location) to posts_comments
-- 2. Enhanced polls table with duration tracking and expiration
-- 3. Added storage bucket configuration info
-- 4. Updated RLS policies for all media operations
-- 5. Added validation constraints for media and poll data
-- 6. Created media_audit_log table for tracking uploads
-- 7. Created post_metadata view for summary information
-- 8. Added location formatting helper function


-- ============================================================================
-- MIGRATION: 20251116_add_poll_fk_constraint.sql
-- ============================================================================
-- Migration: Add foreign key constraint for polls in community_posts
-- This enables nested select queries for polls with posts

-- Add foreign key constraint from community_posts.poll_id to polls.id
ALTER TABLE community_posts 
ADD CONSTRAINT fk_community_posts_poll_id 
FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE SET NULL;

-- Create index for poll_id lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_community_posts_poll_id ON community_posts(poll_id);


-- MIGRATION: 20251116_remove_handle_new_user_trigger.sql
-- ============================================================================
-- Drop the trigger first (triggers depend on functions)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Then drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================================
-- MIGRATION: 20251116_setup_storage_buckets.sql
-- ============================================================================
-- Migration: Setup storage buckets for community posts and media
-- This creates storage buckets and RLS policies for image/gif uploads

-- ============================================================================
-- Create storage buckets (using storage.buckets table)
-- ============================================================================

-- Check if bucket exists and create if not
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-posts',
  'community-posts',
  true,
  52428800, -- 50MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Create RLS policies for community-posts bucket
-- ============================================================================

-- Policy 1: Allow public read access to all files
CREATE POLICY "Public read access for community-posts"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'community-posts');

-- Policy 2: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to community-posts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    bucket_id = 'community-posts'
  );

-- Policy 3: Allow users to delete their own uploads
CREATE POLICY "Users can delete their own community-posts uploads"
  ON storage.objects
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    bucket_id = 'community-posts' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- ============================================================================
-- Create post-gifs bucket for GIF uploads
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-gifs',
  'post-gifs',
  true,
  52428800, -- 50MB limit per file
  ARRAY['image/gif', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Policy 1: Allow public read access to GIFs
CREATE POLICY "Public read access for post-gifs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'post-gifs');

-- Policy 2: Allow authenticated users to upload GIFs
CREATE POLICY "Authenticated users can upload to post-gifs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    bucket_id = 'post-gifs'
  );

-- Policy 3: Allow users to delete their own GIF uploads
CREATE POLICY "Users can delete their own post-gifs uploads"
  ON storage.objects
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    bucket_id = 'post-gifs' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );


-- ============================================================================
-- END OF MIGRATIONS
-- ============================================================================
