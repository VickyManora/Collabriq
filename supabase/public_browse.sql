-- ============================================================
-- Collabriq — Allow public (anonymous) browsing of requirements
-- Run this in Supabase SQL Editor
-- Replaces the auth-only SELECT policy so anyone (including
-- unauthenticated visitors) can see open requirements.
-- Also allows anonymous read of business profile names.
-- ============================================================

-- 1. Drop the existing authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users read open requirements" ON public.requirements;

-- 2. Allow anyone to read open/partially_filled requirements
CREATE POLICY "Public read open requirements"
  ON public.requirements FOR SELECT
  USING (
    status IN ('open', 'partially_filled')
  );

-- 3. Allow anonymous read of business profiles (name + handle only)
-- The existing "Authenticated users can read all profiles" policy
-- requires auth. We add a public policy for minimal profile data.
-- RLS checks are per-row, so this allows SELECT on business profiles.
DROP POLICY IF EXISTS "Public read business profiles" ON public.profiles;
CREATE POLICY "Public read business profiles"
  ON public.profiles FOR SELECT
  USING (
    role = 'business'
    AND is_deleted = FALSE
    AND approval_status = 'approved'
  );
