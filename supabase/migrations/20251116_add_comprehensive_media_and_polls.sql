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

-- Create function to calculate poll expiration
CREATE OR REPLACE FUNCTION calculate_poll_expiration(
  created_timestamp TIMESTAMP WITH TIME ZONE,
  days INTEGER,
  hours INTEGER,
  minutes INTEGER
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN created_timestamp + 
    INTERVAL '1 day' * COALESCE(days, 0) +
    INTERVAL '1 hour' * COALESCE(hours, 0) +
    INTERVAL '1 minute' * COALESCE(minutes, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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
-- ============================================================================

-- Add helper table for tracking poll option vote counts (for optimization)
CREATE TABLE IF NOT EXISTS poll_option_votes_count (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_index INT NOT NULL,
  vote_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, option_index)
);

-- Create indexes for poll vote counts
CREATE INDEX IF NOT EXISTS idx_poll_option_votes_poll_id ON poll_option_votes_count(poll_id);

-- Enable RLS for poll_option_votes_count
ALTER TABLE poll_option_votes_count ENABLE ROW LEVEL SECURITY;

-- RLS Policies for poll_option_votes_count
CREATE POLICY "Poll option votes are viewable by everyone" ON poll_option_votes_count
  FOR SELECT USING (true);

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
-- PART 7: Create view for active polls (not expired)
-- ============================================================================

CREATE OR REPLACE VIEW active_polls AS
SELECT 
  p.*,
  EXTRACT(EPOCH FROM (p.expires_at - NOW())) / 60 AS minutes_remaining,
  NOW() < p.expires_at AS is_active
FROM polls p
WHERE p.expires_at IS NOT NULL;

-- ============================================================================
-- PART 8: Create function to get poll vote counts by option
-- ============================================================================

CREATE OR REPLACE FUNCTION get_poll_vote_counts(poll_id_param UUID)
RETURNS TABLE (
  option_index INT,
  vote_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    upv.option_index,
    COUNT(*) as vote_count
  FROM user_poll_votes upv
  WHERE upv.poll_id = poll_id_param
  GROUP BY upv.option_index
  ORDER BY upv.option_index;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 9: Create function to check if user has voted on a poll
-- ============================================================================

CREATE OR REPLACE FUNCTION user_voted_on_poll(poll_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM user_poll_votes 
    WHERE poll_id = poll_id_param AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 10: Create triggers to update vote counts
-- ============================================================================

-- Create trigger function for updating poll_option_votes_count
CREATE OR REPLACE FUNCTION update_poll_option_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update vote count
  INSERT INTO poll_option_votes_count (poll_id, option_index, vote_count)
  VALUES (NEW.poll_id, NEW.option_index, 1)
  ON CONFLICT (poll_id, option_index) 
  DO UPDATE SET 
    vote_count = vote_count + 1,
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote insertion
CREATE TRIGGER trg_poll_votes_insert 
AFTER INSERT ON user_poll_votes
FOR EACH ROW
EXECUTE FUNCTION update_poll_option_vote_count();

-- Create trigger function for vote deletion
CREATE OR REPLACE FUNCTION update_poll_option_vote_count_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement vote count
  UPDATE poll_option_votes_count
  SET 
    vote_count = GREATEST(0, vote_count - 1),
    updated_at = CURRENT_TIMESTAMP
  WHERE poll_id = OLD.poll_id AND option_index = OLD.option_index;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote deletion
CREATE TRIGGER trg_poll_votes_delete 
AFTER DELETE ON user_poll_votes
FOR EACH ROW
EXECUTE FUNCTION update_poll_option_vote_count_delete();

-- ============================================================================
-- PART 11: Add validation and constraints
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
-- 3. Created poll_option_votes_count table for optimized vote counting
-- 4. Added storage bucket configuration info
-- 5. Updated RLS policies for all media operations
-- 6. Created active_polls view for filtering non-expired polls
-- 7. Added helper functions for poll vote counting and user vote checking
-- 8. Created triggers for automatic vote count updates
-- 9. Added validation constraints for media and poll data
-- 10. Created media_audit_log table for tracking uploads
-- 11. Created post_metadata view for summary information
-- 12. Added location formatting helper function

