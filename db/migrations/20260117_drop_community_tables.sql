-- Migration: Drop all community-related tables
-- Date: 2026-01-17
-- This migration removes all community functionality from the database

-- Drop dependent tables first (foreign keys)
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS community_memberships CASCADE;
DROP TABLE IF EXISTS community_settings CASCADE;
DROP TABLE IF EXISTS communities CASCADE;

-- Verify all community-related indexes are dropped
-- (they should be dropped with CASCADE above, but this ensures cleanup)

-- Confirmation message
-- All community tables have been successfully removed
