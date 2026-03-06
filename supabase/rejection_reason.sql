-- ============================================================
-- Collabriq — Rejection Reason Migration
-- Run this in Supabase SQL Editor
-- Adds rejection_reason column to profiles and requirements
-- ============================================================

-- 1. Add rejection_reason to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;

-- 2. Add rejection_reason to requirements
ALTER TABLE public.requirements
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;

-- 3. RLS: Users cannot modify their own rejection_reason directly.
-- The existing UPDATE policy on profiles allows users to update their own row,
-- but the rejection_reason column is only set by admin actions (via admin RLS policy).
-- To enforce this, we add a trigger that prevents users from changing rejection_reason.

CREATE OR REPLACE FUNCTION public.protect_rejection_reason()
RETURNS TRIGGER AS $$
BEGIN
  -- Only admins can set rejection_reason
  IF public.get_my_role() != 'admin' THEN
    -- Allow clearing rejection_reason when reapplying (status going back to pending)
    IF NEW.approval_status = 'pending' AND NEW.rejection_reason IS NULL THEN
      -- This is allowed (reapply flow)
      NULL;
    ELSE
      -- Preserve existing rejection_reason for non-admin users
      NEW.rejection_reason = OLD.rejection_reason;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_rejection_reason ON public.profiles;
CREATE TRIGGER protect_profile_rejection_reason
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_rejection_reason();

-- 4. Notification for reapply (user sets approval_status back to pending)
CREATE OR REPLACE FUNCTION public.notify_user_reapplied()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status = 'pending' AND OLD.approval_status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      NEW.id,
      'user_approved',  -- Reuse type for the user's own notification
      'Your profile has been resubmitted for approval.'
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_on_user_reapplied ON public.profiles;
CREATE TRIGGER notify_on_user_reapplied
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_reapplied();

-- 5. Enable Realtime for profiles (live approval status updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
