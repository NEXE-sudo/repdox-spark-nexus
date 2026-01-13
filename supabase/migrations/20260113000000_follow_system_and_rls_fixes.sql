-- Migration: Implement Follow System and Fix Conversations RLS

-- 1. Fix Conversations RLS and Defaults
ALTER TABLE public.conversations 
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Update conversation_members policy to allow creator to add the first batch of members
-- (Necessary for starting 1:1 chats where you add your partner)
DROP POLICY IF EXISTS "authenticated_can_insert_own_membership" ON public.conversation_members;
CREATE POLICY "authenticated_can_add_members" ON public.conversation_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

-- 2. Implement Follow System
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, followed_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> followed_id)
);

-- Enable RLS for follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Follows policies
CREATE POLICY "Anyone can see follows" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- 3. Add helper view for profile counts (optional but helpful)
-- Or just let the frontend count.

-- 4. Add indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON public.follows(followed_id);
