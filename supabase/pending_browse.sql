-- ============================================================
-- Collabriq — Allow pending users to browse open requirements
-- Run this in Supabase SQL Editor
-- Changes the SELECT policy so all authenticated users can
-- see open/partially_filled requirements (not just approved)
-- ============================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Approved users read open requirements" ON public.requirements;

-- Create a new policy that allows all authenticated users to browse
CREATE POLICY "Authenticated users read open requirements"
  ON public.requirements FOR SELECT
  USING (
    status IN ('open', 'partially_filled')
    AND auth.uid() IS NOT NULL
  );
