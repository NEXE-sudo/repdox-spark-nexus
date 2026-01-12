-- Migration: Add encryption key store and key rotation helpers

-- Create encryption keys table in app schema
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  key_version integer DEFAULT 1,
  active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Function: get active key (SECURITY DEFINER so it can read the table regardless of caller privileges)
CREATE OR REPLACE FUNCTION app.get_active_encryption_key() RETURNS text AS $$
DECLARE
  k text;
BEGIN
  SELECT key INTO k FROM app.encryption_keys WHERE active = true ORDER BY created_at DESC LIMIT 1;
  IF k IS NULL THEN
    RAISE EXCEPTION 'no active encryption key found in app.encryption_keys';
  END IF;
  RETURN k;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: set (insert) a new key and optionally activate it (deactivates previous active keys)
CREATE OR REPLACE FUNCTION app.set_encryption_key(p_key text, p_activate boolean DEFAULT true) RETURNS void AS $$
BEGIN
  INSERT INTO app.encryption_keys (key, active) VALUES (p_key, false);
  IF p_activate THEN
    -- deactivate others and activate the latest
    UPDATE app.encryption_keys SET active = false WHERE active = true;
    UPDATE app.encryption_keys SET active = true WHERE id = (SELECT id FROM app.encryption_keys WHERE key = p_key ORDER BY created_at DESC LIMIT 1);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace pg_encrypt_text / pg_decrypt_text to read key from app.get_active_encryption_key()
CREATE OR REPLACE FUNCTION app.pg_encrypt_text(input text) RETURNS text AS $$
BEGIN
  RETURN pgp_sym_encrypt(input, app.get_active_encryption_key());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app.pg_decrypt_text(input text) RETURNS text AS $$
BEGIN
  RETURN pgp_sym_decrypt(input, app.get_active_encryption_key());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION app.get_active_encryption_key() IS 'Returns the currently active encryption key from app.encryption_keys';
COMMENT ON FUNCTION app.set_encryption_key(p_key text, p_activate boolean) IS 'Inserts a new key and optionally activates it (deactivates previous active keys)';

-- Done
