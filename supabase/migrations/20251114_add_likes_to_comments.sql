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
