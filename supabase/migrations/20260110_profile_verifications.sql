-- Migration: create profile_verifications table to support email/phone verification tokens
-- Run in staging first, then production

-- Note: users are managed by the auth schema in Supabase (auth.users)
CREATE TABLE IF NOT EXISTS public.profile_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email','phone')),
  contact TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at timestamptz NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_verifications_user_id ON public.profile_verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_profile_verifications_token ON public.profile_verifications (token);