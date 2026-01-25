-- Migration: Server-side encryption functions and RPCs for posts & messages

-- Require pgcrypto for symmetric encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted content column for posts (keep plaintext 'content' for backwards compatibility for now)
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS encrypted_content text;

-- Add helper encryption functions that use a DB setting 'app.encryption_key'

CREATE OR REPLACE FUNCTION app.pg_encrypt_text(input text) RETURNS text AS $$
BEGIN
  IF current_setting('app.encryption_key', true) IS NULL THEN
    RAISE EXCEPTION 'app.encryption_key is not set';
  END IF;
  RETURN pgp_sym_encrypt(input, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app.pg_decrypt_text(input text) RETURNS text AS $$
BEGIN
  IF current_setting('app.encryption_key', true) IS NULL THEN
    RAISE EXCEPTION 'app.encryption_key is not set';
  END IF;
  RETURN pgp_sym_decrypt(input, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Create encrypted post (server side encryption)
CREATE OR REPLACE FUNCTION app.create_encrypted_post(
  p_user_id uuid,
  p_title text,
  p_content text,
  p_images_urls text[] DEFAULT NULL,
  p_gif_url text DEFAULT NULL,
  p_location jsonb DEFAULT NULL
) RETURNS community_posts AS $$
DECLARE
  inserted community_posts%ROWTYPE;
BEGIN
  INSERT INTO community_posts (user_id, title, encrypted_content, images_urls, gif_url, location)
  VALUES (p_user_id, p_title, app.pg_encrypt_text(p_content), p_images_urls, p_gif_url, p_location)
  RETURNING * INTO inserted;
  RETURN inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Decrypt post content for authorized callers
CREATE OR REPLACE FUNCTION app.get_decrypted_post(p_post_id uuid) RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  content text,
  images_urls text[],
  gif_url text,
  location jsonb,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT id, user_id, title, app.pg_decrypt_text(encrypted_content) AS content, images_urls, gif_url, location, created_at, updated_at
  FROM community_posts
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Messages: add encrypted_body column if missing (migration may have added it already)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encrypted_body text;

-- RPC: Send message (encrypt server-side)
CREATE OR REPLACE FUNCTION app.send_message(
  p_conversation_id uuid,
  p_sender_id uuid,
  p_plaintext text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS messages AS $$
DECLARE
  inserted messages%ROWTYPE;
BEGIN
  INSERT INTO messages (conversation_id, sender_id, encrypted_body, metadata)
  VALUES (p_conversation_id, p_sender_id, app.pg_encrypt_text(p_plaintext), p_metadata)
  RETURNING * INTO inserted;
  RETURN inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get decrypted messages for a conversation (limited)
CREATE OR REPLACE FUNCTION app.get_decrypted_messages(p_conversation_id uuid, p_limit integer DEFAULT 50) RETURNS TABLE(
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  body text,
  metadata jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT id, conversation_id, sender_id, app.pg_decrypt_text(encrypted_body) AS body, metadata, created_at
  FROM messages
  WHERE conversation_id = p_conversation_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Provide privileges to authenticated role for these RPCs where appropriate (admins may be required for create_encrypted_post/send_message if we want checks)
-- Note: These functions are SECURITY DEFINER. Ensure the owner is a privileged role and audit access.

-- Done
COMMENT ON FUNCTION app.create_encrypted_post(p_user_id uuid, p_title text, p_content text, p_images_urls text[], p_gif_url text, p_location jsonb) IS 'Creates a community post encrypting the content server-side.';
COMMENT ON FUNCTION app.send_message(p_conversation_id uuid, p_sender_id uuid, p_plaintext text, p_metadata jsonb) IS 'Saves a message encrypting the body server-side.';
