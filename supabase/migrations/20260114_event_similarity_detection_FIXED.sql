-- Migration: Event Similarity Detection (FIXED VERSION)
-- Phase: 3/3 - Create similarity tracking and detection helpers
-- CRITICAL FIXES:
--   - check_event_similarity_phase1() uses normalize_event_title() for BOTH inputs
--   - Uses levenshtein() instead of levenshtein_less_equal()
--   - Similarity calculated correctly: 1 - (distance / GREATEST(length_a, length_b))
--   - Removed 2-character hard cap
--   - Only compares same organizer + location + date±1
--   - Returns rows where similarity >= 0.6 only
--   - Flags duplicates if similarity >= 0.85
--   - Optional enforcement trigger (commented, safe to enable)
-- Execution: Run after usage_quotas_FIXED.sql

-- =============================================================================
-- PART 1: CREATE SIMILARITY TRACKING TABLE (OPTIONAL - FOR ANALYTICS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.event_similarity_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checking_event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  similar_event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  
  -- Phase 1: String-based similarity score (0-1)
  title_similarity_score float NOT NULL,
  
  -- When the check was performed
  checked_at timestamptz DEFAULT now(),
  
  -- Action taken (block, warn, allowed)
  action text DEFAULT 'warn' CHECK (action IN ('block', 'warn', 'allowed')),
  
  -- Notes about why it was flagged
  reason text,
  
  -- Prevent duplicate check records
  UNIQUE (checking_event_id, similar_event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_similarity_checks_event_id
  ON public.event_similarity_checks (checking_event_id);

CREATE INDEX IF NOT EXISTS idx_event_similarity_checks_similar_id
  ON public.event_similarity_checks (similar_event_id);

CREATE INDEX IF NOT EXISTS idx_event_similarity_checks_action
  ON public.event_similarity_checks (action) WHERE action = 'block';

CREATE INDEX IF NOT EXISTS idx_event_similarity_checks_checked_at
  ON public.event_similarity_checks (checked_at DESC);

COMMENT ON TABLE public.event_similarity_checks
  IS 'Tracks similarity detection results between events. Used for duplicate prevention and analytics.';

-- =============================================================================
-- PART 2: TITLE NORMALIZATION HELPER (MUST BE DEFINED FIRST)
-- =============================================================================
-- Purpose: Normalize titles for consistent comparison
-- Removes punctuation, lowercases, normalizes whitespace

CREATE OR REPLACE FUNCTION public.normalize_event_title(p_title text)
RETURNS text AS $$
BEGIN
  -- Lowercase → remove non-alphanumeric + spaces → normalize spaces → trim
  RETURN TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        LOWER(COALESCE(p_title, '')),
        '[^a-z0-9\s]',
        '',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.normalize_event_title(text)
  IS 'Normalizes event title: lowercase, remove punctuation, normalize spaces. Used by similarity detection.';

-- =============================================================================
-- PART 3: EVENT SIMILARITY DETECTION FUNCTION (PHASE 1 - STRING-BASED) - FIXED
-- =============================================================================
-- CRITICAL FIXES:
--   1. Normalizes BOTH p_title and stored e.title using normalize_event_title()
--   2. Uses levenshtein() instead of levenshtein_less_equal()
--   3. Similarity = 1 - (distance / GREATEST(length(a), length(b)))
--   4. No 2-character hard cap
--   5. Only compares same organizer + location + date±1
--   6. Returns only if similarity >= 0.6 (0.5 would be too noisy)
--   7. Flags as duplicate if similarity >= 0.85 (was 0.9, but 0.85 is safer)

CREATE OR REPLACE FUNCTION public.check_event_similarity_phase1(
  p_title text,
  p_location text,
  p_start_at timestamptz,
  p_organizer_id uuid,
  p_exclude_event_id uuid DEFAULT NULL
)
RETURNS TABLE (
  similar_event_id uuid,
  similar_event_title text,
  similarity_score float,
  is_potential_duplicate boolean,
  reason text
) AS $$
DECLARE
  v_normalized_input_title text;
  v_record RECORD;
BEGIN
  -- Normalize the input title once (for efficiency)
  v_normalized_input_title := public.normalize_event_title(p_title);
  
  -- Find events with:
  -- 1. Same organizer
  -- 2. Same location (case-insensitive)
  -- 3. Same date (±1 day)
  -- 4. High title similarity (using normalized titles)
  FOR v_record IN
    SELECT
      e.id,
      e.title,
      -- Calculate similarity using Levenshtein distance
      -- similarity = 1 - (distance / max_length)
      (1.0 - (
        levenshtein(
          v_normalized_input_title,
          public.normalize_event_title(e.title)
        )::float / 
        GREATEST(
          LENGTH(v_normalized_input_title),
          LENGTH(public.normalize_event_title(e.title))
        )::float
      ))::float as similarity,
      -- Normalized titles for comparison
      public.normalize_event_title(e.title) as normalized_title
    FROM public.events e
    WHERE e.created_by = p_organizer_id
      AND LOWER(COALESCE(e.location, '')) = LOWER(COALESCE(p_location, ''))
      AND e.start_at::date BETWEEN (p_start_at - interval '1 day')::date AND (p_start_at + interval '1 day')::date
      AND (p_exclude_event_id IS NULL OR e.id != p_exclude_event_id)
      AND e.id != COALESCE(p_exclude_event_id, '00000000-0000-0000-0000-000000000000')
  LOOP
    -- Only return if similarity >= 0.6 (higher confidence)
    IF v_record.similarity >= 0.6 THEN
      RETURN QUERY
      SELECT
        v_record.id,
        v_record.title,
        v_record.similarity,
        -- Flag as duplicate if similarity >= 0.85
        (v_record.similarity >= 0.85)::boolean as is_dup,
        CASE
          WHEN v_record.similarity >= 0.85 THEN
            'VERY HIGH SIMILARITY (' || ROUND((v_record.similarity * 100)::numeric, 1) || '%) - Likely duplicate'
          WHEN v_record.similarity >= 0.75 THEN
            'HIGH SIMILARITY (' || ROUND((v_record.similarity * 100)::numeric, 1) || '%) - Possible duplicate'
          ELSE
            'MODERATE SIMILARITY (' || ROUND((v_record.similarity * 100)::numeric, 1) || '%) - Low risk'
        END as reason;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.check_event_similarity_phase1(text, text, timestamptz, uuid, uuid)
  IS 'FIXED: Phase 1 string-based similarity. Normalizes both titles, uses levenshtein(), returns similarity >= 0.6, flags >= 0.85 as duplicate.';

-- =============================================================================
-- PART 4: COMPREHENSIVE SIMILARITY CHECK (ORCHESTRATOR)
-- =============================================================================
-- Combines Phase 1 (required) + Phase 2 (optional, if pgvector available)

CREATE OR REPLACE FUNCTION public.detect_duplicate_events(
  p_title text,
  p_location text,
  p_start_at timestamptz,
  p_organizer_id uuid,
  p_exclude_event_id uuid DEFAULT NULL
)
RETURNS TABLE (
  similar_event_id uuid,
  similar_event_title text,
  phase1_similarity_score float,
  phase2_similarity_score float,
  is_duplicate boolean,
  assessment_level text,
  reason text
) AS $$
DECLARE
  v_phase1_record RECORD;
BEGIN
  -- Run Phase 1 checks (always)
  FOR v_phase1_record IN
    SELECT * FROM public.check_event_similarity_phase1(
      p_title, p_location, p_start_at, p_organizer_id, p_exclude_event_id
    )
    ORDER BY similarity_score DESC
  LOOP
    RETURN QUERY
    SELECT
      v_phase1_record.similar_event_id,
      v_phase1_record.similar_event_title,
      v_phase1_record.similarity_score,
      NULL::float,  -- Phase 2 score (optional, future use)
      v_phase1_record.is_potential_duplicate,
      CASE
        WHEN v_phase1_record.similarity_score >= 0.85 THEN 'BLOCK'
        WHEN v_phase1_record.similarity_score >= 0.75 THEN 'WARN'
        ELSE 'ALLOW'
      END,
      v_phase1_record.reason;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.detect_duplicate_events(text, text, timestamptz, uuid, uuid)
  IS 'Orchestrator: Runs Phase 1 string-based detection. Returns assessment (BLOCK/WARN/ALLOW). Extensible for Phase 2 (embeddings).';

-- =============================================================================
-- PART 5: OPTIONAL - EMBEDDING SUPPORT (REQUIRES pgvector EXTENSION)
-- =============================================================================
-- Uncomment and run ONLY if pgvector extension is available.
-- This enables Phase 2 embedding-based similarity for better semantic matching.

/*
-- Create pgvector extension (run once):
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to events table:
-- ALTER TABLE public.events
-- ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create vector index for fast similarity search:
-- CREATE INDEX IF NOT EXISTS idx_events_embedding
--   ON public.events USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);

-- Function for Phase 2 similarity (pgvector cosine similarity):
CREATE OR REPLACE FUNCTION public.check_event_similarity_phase2(
  p_embedding vector(1536),
  p_organizer_id uuid,
  p_exclude_event_id uuid DEFAULT NULL,
  p_similarity_threshold float DEFAULT 0.85
)
RETURNS TABLE (
  similar_event_id uuid,
  similar_event_title text,
  similarity_score float,
  is_potential_duplicate boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    (1 - (p_embedding <=> e.embedding))::float as similarity,
    (1 - (p_embedding <=> e.embedding)) > p_similarity_threshold as is_dup
  FROM public.events e
  WHERE e.embedding IS NOT NULL
    AND e.created_by = p_organizer_id
    AND (p_exclude_event_id IS NULL OR e.id != p_exclude_event_id)
  ORDER BY (p_embedding <=> e.embedding) ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

-- To enable Phase 2, modify detect_duplicate_events() to call this function.
-- Requires embedding generation (e.g., via OpenAI API on event creation).
*/

-- =============================================================================
-- PART 6: EVENT CREATION GUARD TRIGGER (OPTIONAL - ENFORCEMENT)
-- =============================================================================
-- DISABLED BY DEFAULT. Uncomment to enforce strict duplicate prevention.
-- When enabled, blocks events with >= 0.85 similarity to existing events.
-- Error code: duplicate_event

/*
CREATE OR REPLACE FUNCTION public.check_event_duplicate_on_create()
RETURNS TRIGGER AS $$
DECLARE
  v_duplicate RECORD;
BEGIN
  -- Check for high-similarity duplicates
  SELECT * INTO v_duplicate FROM public.detect_duplicate_events(
    NEW.title, NEW.location, NEW.start_at, NEW.created_by, NULL
  )
  WHERE is_duplicate = true AND assessment_level = 'BLOCK'
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'duplicate_event: Event too similar to existing event % (title: "%"). Please use a different title, location, or date.',
      v_duplicate.similar_event_id, v_duplicate.similar_event_title
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (disabled by default)
DROP TRIGGER IF EXISTS trigger_check_duplicate_event_on_create ON public.events;
CREATE TRIGGER trigger_check_duplicate_event_on_create
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.check_event_duplicate_on_create();

-- To disable this trigger later:
-- DROP TRIGGER trigger_check_duplicate_event_on_create ON public.events;

-- Or disable without dropping:
-- ALTER TABLE public.events DISABLE TRIGGER trigger_check_duplicate_event_on_create;
-- ALTER TABLE public.events ENABLE TRIGGER trigger_check_duplicate_event_on_create;
*/

-- =============================================================================
-- PART 7: ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE IF EXISTS public.event_similarity_checks ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "service_role_read_similarity_checks" ON public.event_similarity_checks;
DROP POLICY IF EXISTS "organizers_read_own_similarity_checks" ON public.event_similarity_checks;

-- Service role can read all similarity checks (for monitoring and analytics)
CREATE POLICY "service_role_read_similarity_checks" ON public.event_similarity_checks
FOR SELECT
USING (auth.role() = 'service_role');

-- Event organizers can see similarity checks on their own events
CREATE POLICY "organizers_read_own_similarity_checks" ON public.event_similarity_checks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = checking_event_id AND e.created_by = auth.uid()
  )
);

-- Service role can insert/update checks (for manual interventions or admin)
CREATE POLICY "service_role_write_similarity_checks" ON public.event_similarity_checks
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_update_similarity_checks" ON public.event_similarity_checks
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "service_role_read_similarity_checks" ON public.event_similarity_checks
  IS 'Service role admins can monitor all similarity checks for analytics and debugging';

COMMENT ON POLICY "organizers_read_own_similarity_checks" ON public.event_similarity_checks
  IS 'Event organizers can see similarity detection results for their own events';

-- =============================================================================
-- PART 8: HELPER FUNCTION FOR SIMILARITY LOGGING
-- =============================================================================
-- Logs similarity check results to event_similarity_checks table
-- Call this after detect_duplicate_events() to create analytics records

CREATE OR REPLACE FUNCTION public.log_similarity_check(
  p_checking_event_id uuid,
  p_similar_event_id uuid,
  p_similarity_score float,
  p_action text DEFAULT 'warn',
  p_reason text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_check_id uuid;
BEGIN
  INSERT INTO public.event_similarity_checks (
    checking_event_id,
    similar_event_id,
    title_similarity_score,
    action,
    reason
  )
  VALUES (
    p_checking_event_id,
    p_similar_event_id,
    p_similarity_score,
    COALESCE(p_action, 'warn'),
    COALESCE(p_reason, '')
  )
  ON CONFLICT (checking_event_id, similar_event_id) DO UPDATE
  SET
    title_similarity_score = EXCLUDED.title_similarity_score,
    action = EXCLUDED.action,
    reason = EXCLUDED.reason,
    checked_at = now()
  RETURNING event_similarity_checks.id INTO v_check_id;
  
  RETURN v_check_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_similarity_check(uuid, uuid, float, text, text)
  IS 'Logs similarity detection result to event_similarity_checks table for analytics.';

-- =============================================================================
-- PART 9: MONITORING QUERIES
-- =============================================================================

-- Get recent similarity checks that were BLOCKED:
-- SELECT * FROM public.event_similarity_checks
-- WHERE action = 'block'
-- ORDER BY checked_at DESC
-- LIMIT 20;

-- Get similarity check statistics:
-- SELECT
--   action,
--   COUNT(*) as count,
--   ROUND(AVG(title_similarity_score)::numeric, 3) as avg_similarity,
--   MAX(title_similarity_score) as max_similarity,
--   MIN(title_similarity_score) as min_similarity
-- FROM public.event_similarity_checks
-- GROUP BY action
-- ORDER BY count DESC;

-- Manual similarity check for two events:
-- SELECT * FROM public.detect_duplicate_events(
--   'My Cool Event',
--   'New York',
--   now() + interval '7 days',
--   '<organizer_user_id>'::uuid
-- );

-- =============================================================================
-- ROLLBACK
-- =============================================================================

/*
To rollback this migration, run:

DROP TRIGGER IF EXISTS trigger_check_duplicate_event_on_create ON public.events;

DROP FUNCTION IF EXISTS public.check_event_duplicate_on_create();
DROP FUNCTION IF EXISTS public.check_event_similarity_phase2(vector, uuid, uuid, float);
DROP FUNCTION IF EXISTS public.log_similarity_check(uuid, uuid, float, text, text);
DROP FUNCTION IF EXISTS public.detect_duplicate_events(text, text, timestamptz, uuid, uuid);
DROP FUNCTION IF EXISTS public.check_event_similarity_phase1(text, text, timestamptz, uuid, uuid);
DROP FUNCTION IF EXISTS public.normalize_event_title(text);

DROP POLICY IF EXISTS "service_role_read_similarity_checks" ON public.event_similarity_checks;
DROP POLICY IF EXISTS "organizers_read_own_similarity_checks" ON public.event_similarity_checks;
DROP POLICY IF EXISTS "service_role_write_similarity_checks" ON public.event_similarity_checks;
DROP POLICY IF EXISTS "service_role_update_similarity_checks" ON public.event_similarity_checks;

DROP TABLE IF EXISTS public.event_similarity_checks;
*/
