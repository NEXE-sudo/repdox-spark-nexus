-- Migration: Public wrappers for app encryption RPCs

-- Provide public-schema wrappers so REST/RPC (PostgREST) can call them without schema-qualified names.

CREATE OR REPLACE FUNCTION public.set_encryption_key(p_key text, p_activate boolean DEFAULT true) RETURNS void AS $$
BEGIN
  PERFORM app.set_encryption_key(p_key, p_activate);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_active_encryption_key() RETURNS text AS $$
BEGIN
  RETURN app.get_active_encryption_key();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.set_encryption_key(p_key text, p_activate boolean) IS 'Wrapper that inserts and optionally activates an encryption key via app.set_encryption_key';
COMMENT ON FUNCTION public.get_active_encryption_key() IS 'Wrapper that returns the currently active encryption key from app.get_active_encryption_key';
