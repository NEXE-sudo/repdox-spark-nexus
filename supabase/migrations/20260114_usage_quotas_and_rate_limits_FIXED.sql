-- Migration: Usage Quotas and Rate Limiting (FIXED VERSION)
-- Phase: 2/3 - Create usage_quotas table and enforcement triggers
-- CRITICAL FIXES:
--   - check_and_increment_quota() now ATOMIC: single INSERT...ON CONFLICT...RETURNING
--   - Removed SELECT count first (race condition)
--   - RLS properly configured to allow trigger execution
--   - IP tracking via API routes only (not triggers)
--   - Quota functions have row_security = off
-- Execution: Run after schema_hardening_constraints_FIXED.sql

-- =============================================================================
-- PART 1: CREATE USAGE_QUOTAS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.usage_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  ip text,
  action text NOT NULL,
  date date NOT NULL,
  count int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique constraints to prevent duplicate counters per user/ip/action/date combo
  CONSTRAINT unique_user_quota UNIQUE (user_id, action, date),
  CONSTRAINT unique_ip_quota UNIQUE (ip, action, date),
  
  -- At least one of user_id or ip must be set
  CONSTRAINT check_quota_has_identifier CHECK (user_id IS NOT NULL OR ip IS NOT NULL)
);

-- Indexes for efficient quota lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_usage_quotas_user_action_date
  ON public.usage_quotas (user_id, action, date);

CREATE INDEX IF NOT EXISTS idx_usage_quotas_ip_action_date
  ON public.usage_quotas (ip, action, date);

CREATE INDEX IF NOT EXISTS idx_usage_quotas_date
  ON public.usage_quotas (date);

-- Composite index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_usage_quotas_created_at
  ON public.usage_quotas (created_at DESC);

COMMENT ON TABLE public.usage_quotas
  IS 'Tracks usage per user for quota enforcement. Incremented by trigger functions (atomic). IP tracking is done via API routes only.';

-- =============================================================================
-- PART 2: CREATE QUOTA LIMIT DEFINITIONS (EDITABLE)
-- =============================================================================

-- Define quota limits (can be updated without code changes)
CREATE TABLE IF NOT EXISTS public.quota_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text UNIQUE NOT NULL,
  limit_per_day int NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Insert default limits (IF NOT EXISTS to be safe)
INSERT INTO public.quota_limits (action, limit_per_day, description)
VALUES
  ('create_event', 5, 'Max events a user can create per day'),
  ('register_event', 200, 'Max event registrations per user per day'),
  ('verification_request', 20, 'Max verification requests (email/phone) per user per day'),
  ('qr_fetch', 10000, 'Max QR code fetches per user per day (tracked in API routes only)'),
  ('api_call_general', 5000, 'General API call rate limit per user per day (tracked in API routes via middleware)')
ON CONFLICT (action) DO NOTHING;

COMMENT ON TABLE public.quota_limits
  IS 'Defines the daily limits for various actions. Update here instead of changing code/triggers.';

-- =============================================================================
-- PART 3: ATOMIC QUOTA ENFORCEMENT FUNCTION (CRITICAL FIX)
-- =============================================================================
-- FIXED: Single INSERT...ON CONFLICT...DO UPDATE...RETURNING statement
--        No SELECT before INSERT (race condition eliminated)
--        Returns (allowed, current_count, limit_per_day)

CREATE OR REPLACE FUNCTION public.check_and_increment_quota(
  p_user_id uuid DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_action text DEFAULT 'api_call_general'
)
RETURNS TABLE (
  allowed boolean,
  current_count int,
  limit_per_day int
) AS $$
DECLARE
  v_limit int;
  v_count int;
  v_date date;
  v_action text;
BEGIN
  v_date := CURRENT_DATE;
  v_action := COALESCE(p_action, 'api_call_general');
  
  -- STEP 1: Get the limit for this action
  SELECT quota_limits.limit_per_day INTO v_limit
  FROM public.quota_limits
  WHERE quota_limits.action = v_action;
  
  -- Default to 5000 if not found
  v_limit := COALESCE(v_limit, 5000);
  
  -- STEP 2: Atomically increment or insert (CRITICAL FIX)
  -- Single operation: INSERT...ON CONFLICT...DO UPDATE...RETURNING
  IF p_user_id IS NOT NULL THEN
    -- Quota tracked by user_id
    INSERT INTO public.usage_quotas (user_id, action, date, count)
    VALUES (p_user_id, v_action, v_date, 1)
    ON CONFLICT (user_id, action, date) DO UPDATE
    SET count = usage_quotas.count + 1,
        updated_at = now()
    RETURNING usage_quotas.count INTO v_count;
  ELSIF p_ip IS NOT NULL THEN
    -- Quota tracked by IP (used by API routes + middleware only)
    INSERT INTO public.usage_quotas (ip, action, date, count)
    VALUES (p_ip, v_action, v_date, 1)
    ON CONFLICT (ip, action, date) DO UPDATE
    SET count = usage_quotas.count + 1,
        updated_at = now()
    RETURNING usage_quotas.count INTO v_count;
  ELSE
    -- SAFETY: Must have at least user_id or ip
    RAISE EXCEPTION 'quota_error: must provide either p_user_id or p_ip';
  END IF;
  
  -- STEP 3: Check if allowed and return
  -- If count > limit, allowed = false, but we still incremented
  RETURN QUERY
  SELECT
    (v_count <= v_limit)::boolean as allowed,
    v_count::int as current_count,
    v_limit::int as limit_per_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CRITICAL: Disable row_security for this function
-- Triggers need to write regardless of RLS policies
ALTER FUNCTION public.check_and_increment_quota(uuid, text, text)
SET row_security = off;

COMMENT ON FUNCTION public.check_and_increment_quota
  IS 'ATOMIC: Single INSERT...ON CONFLICT...DO UPDATE. Increments quota counter and returns (allowed, current_count, limit). Call from triggers only. No SELECT before INSERT = no race conditions.';

-- =============================================================================
-- PART 4: QUOTA ENFORCEMENT TRIGGER FOR EVENTS
-- =============================================================================

-- Function to enforce create_event quota
CREATE OR REPLACE FUNCTION public.enforce_create_event_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Only check if user_id is set (organizer must be authenticated)
  IF NEW.created_by IS NOT NULL THEN
    SELECT * INTO v_result
    FROM public.check_and_increment_quota(
      p_user_id := NEW.created_by,
      p_ip := NULL,
      p_action := 'create_event'
    );
    
    IF NOT v_result.allowed THEN
      RAISE EXCEPTION 'quota_exceeded:create_event: Limit of % per day exceeded (current: %)',
        v_result.limit_per_day, v_result.current_count
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable row_security for trigger function
ALTER FUNCTION public.enforce_create_event_quota()
SET row_security = off;

-- Attach trigger to events table (BEFORE INSERT)
DROP TRIGGER IF EXISTS trigger_enforce_create_event_quota ON public.events;
CREATE TRIGGER trigger_enforce_create_event_quota
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.enforce_create_event_quota();

COMMENT ON TRIGGER trigger_enforce_create_event_quota ON public.events
  IS 'BEFORE INSERT: Enforces 5 events per user per day. Raises quota_exceeded:create_event if exceeded.';

-- =============================================================================
-- PART 5: QUOTA ENFORCEMENT TRIGGER FOR REGISTRATIONS
-- =============================================================================

-- Function to enforce register_event quota
CREATE OR REPLACE FUNCTION public.enforce_register_event_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Check quota for authenticated user only (guests don't have quotas)
  IF NEW.user_id IS NOT NULL THEN
    SELECT * INTO v_result
    FROM public.check_and_increment_quota(
      p_user_id := NEW.user_id,
      p_ip := NULL,
      p_action := 'register_event'
    );
    
    IF NOT v_result.allowed THEN
      RAISE EXCEPTION 'quota_exceeded:register_event: Limit of % per day exceeded (current: %)',
        v_result.limit_per_day, v_result.current_count
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable row_security for trigger function
ALTER FUNCTION public.enforce_register_event_quota()
SET row_security = off;

-- Attach trigger to event_registrations table
DROP TRIGGER IF EXISTS trigger_enforce_register_event_quota ON public.event_registrations;
CREATE TRIGGER trigger_enforce_register_event_quota
BEFORE INSERT ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_register_event_quota();

COMMENT ON TRIGGER trigger_enforce_register_event_quota ON public.event_registrations
  IS 'BEFORE INSERT: Enforces 200 registrations per user per day. Raises quota_exceeded:register_event if exceeded.';

-- =============================================================================
-- PART 6: QUOTA ENFORCEMENT FOR VERIFICATION REQUESTS
-- =============================================================================

-- Function to enforce verification_request quota
CREATE OR REPLACE FUNCTION public.enforce_verification_request_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Check quota for user
  SELECT * INTO v_result
  FROM public.check_and_increment_quota(
    p_user_id := NEW.user_id,
    p_ip := NULL,
    p_action := 'verification_request'
  );
  
  IF NOT v_result.allowed THEN
    RAISE EXCEPTION 'quota_exceeded:verification_request: Limit of % per day exceeded (current: %)',
      v_result.limit_per_day, v_result.current_count
      USING ERRCODE = 'P0001';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable row_security for trigger function
ALTER FUNCTION public.enforce_verification_request_quota()
SET row_security = off;

-- Attach trigger to profile_verifications
DROP TRIGGER IF EXISTS trigger_enforce_verification_quota ON public.profile_verifications;
CREATE TRIGGER trigger_enforce_verification_quota
BEFORE INSERT ON public.profile_verifications
FOR EACH ROW
EXECUTE FUNCTION public.enforce_verification_request_quota();

COMMENT ON TRIGGER trigger_enforce_verification_quota ON public.profile_verifications
  IS 'BEFORE INSERT: Enforces 20 verification requests per user per day. Raises quota_exceeded:verification_request if exceeded.';

-- =============================================================================
-- PART 7: PERIODIC CLEANUP (OPTIONAL - RUN VIA CRON OR MANUALLY)
-- =============================================================================

-- Function to clean up old quota entries (older than 90 days)
-- To call: SELECT * FROM public.cleanup_old_quotas(90);
CREATE OR REPLACE FUNCTION public.cleanup_old_quotas(p_days_old int DEFAULT 90)
RETURNS TABLE (deleted_count int) AS $$
DECLARE
  v_count int;
BEGIN
  DELETE FROM public.usage_quotas
  WHERE date < (CURRENT_DATE - p_days_old);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_quotas
  IS 'Deletes quota records older than specified days. Run manually or via pg_cron scheduler: SELECT cron.schedule(''cleanup_quotas'', ''0 2 * * *'', ''SELECT public.cleanup_old_quotas(90)'');';

-- =============================================================================
-- PART 8: ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE IF EXISTS public.usage_quotas ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "service_role_read_all_quotas" ON public.usage_quotas;
DROP POLICY IF EXISTS "users_read_own_quotas" ON public.usage_quotas;
DROP POLICY IF EXISTS "only_triggers_insert_quotas" ON public.usage_quotas;
DROP POLICY IF EXISTS "only_system_update_quotas" ON public.usage_quotas;

-- Service role can see all quotas (for monitoring/analytics)
-- This is permissive and does not block trigger execution
CREATE POLICY "service_role_read_all_quotas" ON public.usage_quotas
FOR SELECT
USING (auth.role() = 'service_role');

-- Users can see their own quota usage (to understand rate limits)
CREATE POLICY "users_read_own_quotas" ON public.usage_quotas
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert/update (for manual interventions)
-- Triggers will work because they use SECURITY DEFINER functions with row_security = off
CREATE POLICY "service_role_write_quotas" ON public.usage_quotas
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_update_quotas" ON public.usage_quotas
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "service_role_read_all_quotas" ON public.usage_quotas
  IS 'Service role can monitor all quota usage for analytics and debugging';

COMMENT ON POLICY "users_read_own_quotas" ON public.usage_quotas
  IS 'Users can see their own quota usage to understand rate limits';

COMMENT ON POLICY "service_role_write_quotas" ON public.usage_quotas
  IS 'Service role can insert quotas (normal path is trigger execution with row_security = off)';

-- =============================================================================
-- PART 9: MONITORING QUERIES
-- =============================================================================

-- To check current quota usage for a user:
-- SELECT * FROM public.usage_quotas WHERE user_id = '<uuid>' AND date = CURRENT_DATE;

-- To check quota limits:
-- SELECT * FROM public.quota_limits;

-- To reset a user's quota (for testing/admin):
-- DELETE FROM public.usage_quotas WHERE user_id = '<uuid>' AND action = 'create_event' AND date = CURRENT_DATE;

-- To get quota usage summary:
-- SELECT action, date, COUNT(*) as users_affected, MAX(count) as max_count, AVG(count) as avg_count
-- FROM public.usage_quotas
-- WHERE date = CURRENT_DATE
-- GROUP BY action, date
-- ORDER BY action;

COMMENT ON TABLE public.usage_quotas
  IS 'Quota tracking table. Atomic increment via check_and_increment_quota() function. IP tracking is only done in API routes (middleware/edge).';

-- =============================================================================
-- ROLLBACK
-- =============================================================================

/*
To rollback this migration, run:

DROP TRIGGER IF EXISTS trigger_enforce_create_event_quota ON public.events;
DROP TRIGGER IF EXISTS trigger_enforce_register_event_quota ON public.event_registrations;
DROP TRIGGER IF EXISTS trigger_enforce_verification_quota ON public.profile_verifications;

DROP FUNCTION IF EXISTS public.enforce_create_event_quota();
DROP FUNCTION IF EXISTS public.enforce_register_event_quota();
DROP FUNCTION IF EXISTS public.enforce_verification_request_quota();
DROP FUNCTION IF EXISTS public.check_and_increment_quota(uuid, text, text);
DROP FUNCTION IF EXISTS public.cleanup_old_quotas(int);

DROP POLICY IF EXISTS "service_role_read_all_quotas" ON public.usage_quotas;
DROP POLICY IF EXISTS "users_read_own_quotas" ON public.usage_quotas;
DROP POLICY IF EXISTS "service_role_write_quotas" ON public.usage_quotas;
DROP POLICY IF EXISTS "service_role_update_quotas" ON public.usage_quotas;

DROP TABLE IF EXISTS public.usage_quotas;
DROP TABLE IF EXISTS public.quota_limits;
*/
