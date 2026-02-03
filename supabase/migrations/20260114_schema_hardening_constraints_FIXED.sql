-- Migration: Schema Hardening - Add UNIQUE constraints and foreign keys
-- Phase: 1/3 - Constraints and column renaming
-- FIXED VERSION: Addresses check constraint on start_at and partial unique index syntax
-- Execution: Run in staging first, verify, then production

-- =============================================================================
-- PART 1: DROP PROBLEMATIC CONSTRAINTS (IF THEY EXIST)
-- =============================================================================

-- Drop the problematic CHECK constraint that prevents future event creation
-- This constraint blocked all inserts where start_at < now() even in migrations
ALTER TABLE IF EXISTS public.events
DROP CONSTRAINT IF EXISTS check_events_start_at_valid;

-- =============================================================================
-- PART 2: CREATE PARTIAL UNIQUE INDEXES (NOT ALTER TABLE CONSTRAINTS)
-- =============================================================================

-- user_profiles: user_id should be unique (one profile per user)
DO $$
BEGIN
  ALTER TABLE public.user_profiles
  ADD CONSTRAINT unique_user_profiles_user_id UNIQUE (user_id);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- user_profiles: handle should be unique (handles are like usernames)
-- Use CREATE UNIQUE INDEX instead of ALTER TABLE for partial constraint
DROP INDEX IF EXISTS idx_user_profiles_handle_unique;
CREATE UNIQUE INDEX idx_user_profiles_handle_unique
  ON public.user_profiles (LOWER(handle))
  WHERE handle IS NOT NULL;

-- profile_verifications: one verification per user per type
DO $$
BEGIN
  ALTER TABLE public.profile_verifications
  ADD CONSTRAINT unique_profile_verifications_user_type UNIQUE (user_id, type);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- events: slug should be unique (friendly URLs)
-- Use CREATE UNIQUE INDEX instead of ALTER TABLE for partial constraint
DROP INDEX IF EXISTS idx_events_slug_unique;
CREATE UNIQUE INDEX idx_events_slug_unique
  ON public.events (slug)
  WHERE slug IS NOT NULL;

-- event_registrations: prevent duplicate registrations
-- For authenticated users: unique(event_id, user_id)
-- For guests: unique(event_id, lower(email))
DROP INDEX IF EXISTS idx_event_registrations_user_unique;
CREATE UNIQUE INDEX idx_event_registrations_user_unique
  ON public.event_registrations (event_id, user_id)
  WHERE user_id IS NOT NULL;

DROP INDEX IF EXISTS idx_event_registrations_email_unique;
CREATE UNIQUE INDEX idx_event_registrations_email_unique
  ON public.event_registrations (event_id, LOWER(email))
  WHERE user_id IS NULL AND email IS NOT NULL;

-- =============================================================================
-- PART 3: RENAME COLUMNS
-- =============================================================================

-- Rename "Date of Birth" to date_of_birth (PostgreSQL best practices)
DO $$
BEGIN
  -- Check if the old column exists before attempting migration
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'Date of Birth'
  ) THEN
    -- Add the new column
    ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS date_of_birth_new DATE;

    -- Copy data from old column to new column
    UPDATE public.user_profiles
    SET date_of_birth_new = CAST("Date of Birth" AS DATE)
    WHERE "Date of Birth" IS NOT NULL;

    -- Drop old column
    ALTER TABLE public.user_profiles
    DROP COLUMN "Date of Birth" CASCADE;

    -- Rename new column
    ALTER TABLE public.user_profiles
    RENAME COLUMN date_of_birth_new TO date_of_birth;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'date_of_birth'
  ) THEN
    -- If neither exists, create it
    ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS date_of_birth DATE;
  END IF;
END $$;

-- Create index on date_of_birth for age-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_date_of_birth
  ON public.user_profiles (date_of_birth);

-- =============================================================================
-- PART 4: ADD FOREIGN KEY CONSTRAINTS (SAFE)
-- =============================================================================

-- Ensure event_registrations.event_id references events.id
DO $$
BEGIN
  ALTER TABLE public.event_registrations
  ADD CONSTRAINT fk_event_registrations_event_id
    FOREIGN KEY (event_id) REFERENCES public.events (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Ensure event_registrations.user_id references auth.users (nullable)
DO $$
BEGIN
  ALTER TABLE public.event_registrations
  ADD CONSTRAINT fk_event_registrations_user_id
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Ensure events.created_by references auth.users
DO $$
BEGIN
  ALTER TABLE public.events
  ADD CONSTRAINT fk_events_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Ensure user_profiles.user_id references auth.users
DO $$
BEGIN
  ALTER TABLE public.user_profiles
  ADD CONSTRAINT fk_user_profiles_user_id
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- =============================================================================
-- PART 5: ADD CHECK CONSTRAINTS (SAFE)
-- =============================================================================

-- Events: end_at must be after start_at
DO $$
BEGIN
  ALTER TABLE public.events
  ADD CONSTRAINT check_events_end_at_after_start
    CHECK (end_at > start_at);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Events: registration_deadline must be before start_at (if set)
DO $$
BEGIN
  ALTER TABLE public.events
  ADD CONSTRAINT check_registration_deadline_valid
    CHECK (registration_deadline IS NULL OR registration_deadline <= start_at);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Event registrations: status must be valid
DO $$
BEGIN
  ALTER TABLE public.event_registrations
  ADD CONSTRAINT check_event_registrations_status
    CHECK (status IN ('registered', 'checked_in', 'no_show', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Profile verifications: type must be valid
DO $$
BEGIN
  ALTER TABLE public.profile_verifications
  ADD CONSTRAINT check_profile_verifications_type
    CHECK (type IN ('email', 'phone'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- =============================================================================
-- PART 6: TRIGGER TO ENFORCE start_at >= now() (INSTEAD OF CHECK)
-- =============================================================================
-- Why: Allows updates to past events and doesn't block inserts during migrations
-- Usage: Trigger only blocks NEW events from starting in the past

CREATE OR REPLACE FUNCTION public.enforce_future_event_start_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce for INSERT operations, not UPDATE
  -- This allows updates to past events without restriction
  IF TG_OP = 'INSERT' THEN
    IF NEW.start_at < now() THEN
      RAISE EXCEPTION 'event_start_in_past: Event start_at (%) cannot be in the past (now: %)',
        NEW.start_at, now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_future_event_start_time ON public.events;
CREATE TRIGGER trigger_enforce_future_event_start_time
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.enforce_future_event_start_time();

COMMENT ON TRIGGER trigger_enforce_future_event_start_time ON public.events
  IS 'Enforces that new events must start in the future. Allows updating past events.';

-- =============================================================================
-- PART 7: ADD INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for finding organizer's events
CREATE INDEX IF NOT EXISTS idx_events_created_by_start_at
  ON public.events (created_by, start_at DESC);

-- Index for finding user registrations
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id
  ON public.event_registrations (user_id);

-- Index for finding non-null emails in registrations
CREATE INDEX IF NOT EXISTS idx_event_registrations_email
  ON public.event_registrations (event_id, LOWER(email))
  WHERE email IS NOT NULL;

-- Index for profile verifications lookups
CREATE INDEX IF NOT EXISTS idx_profile_verifications_user_type
  ON public.profile_verifications (user_id, type);

-- Index for looking up users by handle
CREATE INDEX IF NOT EXISTS idx_user_profiles_handle
  ON public.user_profiles (LOWER(handle))
  WHERE handle IS NOT NULL;

-- =============================================================================
-- PART 8: COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON CONSTRAINT unique_user_profiles_user_id ON public.user_profiles
  IS 'Ensures one profile per authenticated user';

COMMENT ON CONSTRAINT unique_profile_verifications_user_type ON public.profile_verifications
  IS 'Prevents multiple pending verifications for same user+type (e.g., multiple email verifications)';

COMMENT ON CONSTRAINT check_events_end_at_after_start ON public.events
  IS 'Event end time must be after start time';

COMMENT ON CONSTRAINT check_registration_deadline_valid ON public.events
  IS 'Registration deadline must be before event start (if set)';

COMMENT ON INDEX idx_event_registrations_user_unique
  IS 'Prevents authenticated users from registering twice for same event';

COMMENT ON INDEX idx_event_registrations_email_unique
  IS 'Prevents guest registrations with same email for same event';

COMMENT ON FUNCTION public.enforce_future_event_start_time()
  IS 'BEFORE INSERT/UPDATE trigger: Ensures new events cannot start in the past. Allows editing past events.';

-- =============================================================================
-- ROLLBACK
-- =============================================================================

/*
-- To rollback this migration, run:

DROP TRIGGER IF EXISTS trigger_enforce_future_event_start_time ON public.events;
DROP FUNCTION IF EXISTS public.enforce_future_event_start_time();

DROP INDEX IF EXISTS idx_user_profiles_handle_unique;
DROP INDEX IF EXISTS idx_events_slug_unique;
DROP INDEX IF EXISTS idx_event_registrations_user_unique;
DROP INDEX IF EXISTS idx_event_registrations_email_unique;
DROP INDEX IF EXISTS idx_events_created_by_start_at;
DROP INDEX IF EXISTS idx_event_registrations_user_id;
DROP INDEX IF EXISTS idx_event_registrations_email;
DROP INDEX IF EXISTS idx_profile_verifications_user_type;
DROP INDEX IF EXISTS idx_user_profiles_handle;
DROP INDEX IF EXISTS idx_user_profiles_date_of_birth;

ALTER TABLE IF EXISTS public.events
DROP CONSTRAINT IF EXISTS fk_events_created_by;

ALTER TABLE IF EXISTS public.event_registrations
DROP CONSTRAINT IF EXISTS fk_event_registrations_event_id;

ALTER TABLE IF EXISTS public.event_registrations
DROP CONSTRAINT IF EXISTS fk_event_registrations_user_id;

ALTER TABLE IF EXISTS public.user_profiles
DROP CONSTRAINT IF EXISTS fk_user_profiles_user_id;

ALTER TABLE IF EXISTS public.events
DROP CONSTRAINT IF EXISTS check_events_end_at_after_start;

ALTER TABLE IF EXISTS public.events
DROP CONSTRAINT IF EXISTS check_registration_deadline_valid;

ALTER TABLE IF EXISTS public.event_registrations
DROP CONSTRAINT IF EXISTS check_event_registrations_status;

ALTER TABLE IF EXISTS public.profile_verifications
DROP CONSTRAINT IF EXISTS check_profile_verifications_type;

-- If you have a backup, restore date_of_birth column
-- Note: date_of_birth migration is not easily reversible without data backup
*/
