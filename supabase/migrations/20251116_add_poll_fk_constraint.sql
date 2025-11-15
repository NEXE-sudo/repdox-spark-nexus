-- Migration: Add foreign key constraint for polls in community_posts
-- This enables nested select queries for polls with posts

-- Add foreign key constraint from community_posts.poll_id to polls.id
ALTER TABLE community_posts 
ADD CONSTRAINT fk_community_posts_poll_id 
FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE SET NULL;

-- Create index for poll_id lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_community_posts_poll_id ON community_posts(poll_id);
