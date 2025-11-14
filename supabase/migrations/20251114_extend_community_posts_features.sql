-- Extend community_posts table with new features
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS images_urls TEXT[] DEFAULT '{}';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS gif_url TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS location JSONB;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS poll_id UUID;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE;

-- Create posts_likes table to track individual likes
CREATE TABLE IF NOT EXISTS posts_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- Create posts_comments table for comments
CREATE TABLE IF NOT EXISTS posts_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create poll_votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_posts_likes_post_id ON posts_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_likes_user_id ON posts_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_comments_post_id ON posts_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_comments_user_id ON posts_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_polls_post_id ON polls(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);

-- Enable RLS
ALTER TABLE posts_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts_likes
CREATE POLICY "Posts likes are viewable by everyone" ON posts_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON posts_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON posts_likes
  FOR DELETE USING (auth.uid() = user_id);

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

-- RLS Policies for poll_votes
CREATE POLICY "Poll votes are viewable by everyone" ON poll_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can vote on polls" ON poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON poll_votes
  FOR DELETE USING (auth.uid() = user_id);
