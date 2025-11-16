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
