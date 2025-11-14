-- Add created_by column to events and create RLS policy to ensure only creators can insert
ALTER TABLE IF EXISTS public.events
ADD COLUMN IF NOT EXISTS created_by uuid;

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present, then create a policy that requires the inserting user's id to match created_by
DROP POLICY IF EXISTS "Authenticated can insert events" ON public.events;
CREATE POLICY "Authenticated can insert events"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Allow authenticated users to manage events they created
DROP POLICY IF EXISTS "Owners can manage their events" ON public.events;
CREATE POLICY "Owners can manage their events"
  ON public.events
  FOR ALL
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
