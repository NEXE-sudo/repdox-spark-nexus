-- Migration: add provider tracking columns to support delivery status tracking (Twilio/SendGrid)
-- Run in staging first, then production

ALTER TABLE public.profile_verifications
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_sid TEXT,
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profile_verifications_provider_status ON public.profile_verifications (provider_status);
