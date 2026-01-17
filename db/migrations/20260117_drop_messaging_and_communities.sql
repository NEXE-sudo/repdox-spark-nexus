-- Migration: Drop messaging and community tables
-- Date: 2026-01-17
-- This migration removes all messaging, community, and related features from the database

-- Drop dependent tables first (foreign keys)
DROP TABLE IF EXISTS message_attachments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_members CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS community_memberships CASCADE;
DROP TABLE IF EXISTS community_settings CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS follows CASCADE;

-- Drop any related functions/RPCs
DROP FUNCTION IF EXISTS app.create_encrypted_post(uuid, text, text, text[], text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS app.get_decrypted_messages(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS app.create_encrypted_message(uuid, uuid, text, jsonb) CASCADE;

-- All messaging and community tables have been successfully removed
