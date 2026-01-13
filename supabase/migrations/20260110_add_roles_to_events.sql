-- Migration: Add roles JSONB to events and role to event_registrations
-- Run this in staging first, then production after verification

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS roles JSONB;

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS role TEXT;

CREATE INDEX IF NOT EXISTS idx_event_roles ON public.events USING gin (roles jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id_role ON public.event_registrations (event_id, role);
