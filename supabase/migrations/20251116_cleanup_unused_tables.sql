-- Migration: Clean up unused tables and helpers
-- Removes tables and functions that aren't being used in the application

-- Drop unused poll option votes count table (not used in code)
DROP TABLE IF EXISTS poll_option_votes_count CASCADE;

-- Drop unused user_poll_votes table (not used in code, polls use simple options array instead)
DROP TABLE IF EXISTS user_poll_votes CASCADE;

-- Drop the helper function for poll expiration if it's not being used
DROP FUNCTION IF EXISTS calculate_poll_expiration(TIMESTAMP WITH TIME ZONE, INTEGER, INTEGER, INTEGER) CASCADE;

-- Drop the active_polls view if it exists
DROP VIEW IF EXISTS active_polls CASCADE;

-- Drop unused get_poll_vote_counts function if it exists
DROP FUNCTION IF EXISTS get_poll_vote_counts(UUID) CASCADE;
