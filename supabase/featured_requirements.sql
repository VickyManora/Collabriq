-- ============================================================
-- Collabriq — Add is_featured column to requirements
-- Run this in Supabase SQL Editor
-- Allows admin to mark requirements as featured for landing page
-- ============================================================

-- 1. Add is_featured column (defaults to false)
ALTER TABLE public.requirements
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create index for quick featured lookup
CREATE INDEX IF NOT EXISTS idx_requirements_is_featured
  ON public.requirements (is_featured)
  WHERE is_featured = TRUE;
