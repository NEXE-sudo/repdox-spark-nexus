-- Migration: Remove all community, messaging, hashtag, and social features
-- Date: 2026-01-17
-- This migration removes all unnecessary tables created for removed features

-- Drop tables with CASCADE to handle dependencies automatically
-- Order matters due to foreign keys, so we drop from most dependent to least

-- Messaging system
DROP TABLE IF EXISTS message_attachments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_members CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Community system
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS community_memberships CASCADE;
DROP TABLE IF EXISTS community_settings CASCADE;
DROP TABLE IF EXISTS communities CASCADE;

-- Social features
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS user_post_bookmarks CASCADE;
DROP TABLE IF EXISTS user_post_likes CASCADE;
DROP TABLE IF EXISTS user_post_reposts CASCADE;
DROP TABLE IF EXISTS user_comment_likes CASCADE;
DROP TABLE IF EXISTS posts_comments CASCADE;
DROP TABLE IF EXISTS post_views CASCADE;
DROP TABLE IF EXISTS polls CASCADE;

-- Media audit log (if it was only for community/message media)
DROP TABLE IF EXISTS media_audit_log CASCADE;

-- Drop associated functions/RPCs
DROP FUNCTION IF EXISTS app.create_encrypted_post(uuid, text, text, text[], text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS app.get_decrypted_messages(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS app.create_encrypted_message(uuid, uuid, text, jsonb) CASCADE;

-- Drop custom types if no longer needed
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS event_format CASCADE;

-- Cleanup complete: Removed all community, messaging, social features
-- Kept tables: events, event_registrations, event_schedules, event_teams, user_profiles, profile_verifications, media_audit_log
