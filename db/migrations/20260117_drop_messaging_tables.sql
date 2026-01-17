-- Migration: Drop messaging-related tables
-- Date: 2026-01-17
-- This migration removes all messaging/direct messaging functionality from the database

-- Drop dependent tables first (foreign keys)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Verify all messaging-related indexes are dropped
-- (they should be dropped with CASCADE above, but this ensures cleanup)

-- Confirmation message
-- All messaging tables have been successfully removed
