-- Migration: Add register_for_event RPC
-- Adds an atomic stored procedure to check capacity, enforce registration_deadline,
-- prevent duplicate registrations, and insert into event_registrations in one transaction.

CREATE OR REPLACE FUNCTION public.register_for_event(
  p_event_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
) RETURNS public.event_registrations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_elem JSONB;
  v_capacity INT;
  v_count INT;
  v_row public.event_registrations%ROWTYPE;
BEGIN
  -- Serialize registration attempts for a given event using an advisory lock
  PERFORM pg_advisory_xact_lock(('x' || substr(md5(p_event_id::text), 1, 16))::bit(64)::bigint);

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  IF v_event.registration_deadline IS NOT NULL AND now() > v_event.registration_deadline THEN
    RAISE EXCEPTION 'registration_closed';
  END IF;

  -- If a role is requested, enforce capacity if defined
  v_capacity := NULL;
  IF p_role IS NOT NULL AND v_event.roles IS NOT NULL THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_event.roles) LOOP
      IF jsonb_typeof(v_elem) = 'string' THEN
        IF v_elem::text = to_jsonb(p_role)::text THEN
          v_capacity := NULL;
          EXIT;
        END IF;
      ELSE
        IF (v_elem->>'name') = p_role OR (v_elem->>'role') = p_role THEN
          IF v_elem ? 'capacity' THEN
            v_capacity := (v_elem->>'capacity')::int;
          ELSE
            v_capacity := NULL;
          END IF;
          EXIT;
        END IF;
      END IF;
    END LOOP;
  END IF;

  IF v_capacity IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.event_registrations WHERE event_id = p_event_id AND role = p_role;
    IF v_count >= v_capacity THEN
      RAISE EXCEPTION 'role_full';
    END IF;
  END IF;

  -- Prevent duplicate registration by user for same event
  IF p_user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.event_registrations WHERE event_id = p_event_id AND user_id = p_user_id) THEN
      RAISE EXCEPTION 'already_registered';
    END IF;
  END IF;

  INSERT INTO public.event_registrations (event_id, user_id, name, email, phone, message, status, role)
  VALUES (p_event_id, p_user_id, p_name, p_email, p_phone, p_message, 'registered', p_role)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.register_for_event(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT) IS 'Atomic registration RPC: checks deadline, role capacity, prevents duplicate registrations and inserts a registration.';
