-- Migration: Drop deprecated tables
-- After migrating to user_post_likes and user_poll_votes, we can drop the old tables

-- Drop posts_likes table (data migrated to user_post_likes)
DROP TABLE IF EXISTS posts_likes CASCADE;

-- Drop poll_votes table (data migrated to user_poll_votes)
DROP TABLE IF EXISTS poll_votes CASCADE;
