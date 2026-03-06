-- ============================================================
-- Collabriq — Email Notification Triggers
-- Run this in Supabase SQL Editor
--
-- Creates a notifications table and triggers that fire on
-- important events. These can be consumed by a Supabase Edge
-- Function or external webhook to send actual emails.
-- ============================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Trigger: Profile approved
CREATE OR REPLACE FUNCTION notify_profile_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.approval_status != 'approved' AND NEW.approval_status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      NEW.id,
      'profile_approved',
      'Your profile has been approved!',
      'Welcome to Collabriq! Your account has been approved. You can now access all platform features.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_profile_approved ON public.profiles;
CREATE TRIGGER trg_notify_profile_approved
  AFTER UPDATE OF approval_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_profile_approved();

-- 3. Trigger: Profile rejected
CREATE OR REPLACE FUNCTION notify_profile_rejected()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.approval_status != 'rejected' AND NEW.approval_status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      NEW.id,
      'profile_rejected',
      'Your profile needs updates',
      COALESCE('Reason: ' || NEW.rejection_reason, 'Please update your profile and resubmit for approval.'),
      jsonb_build_object('rejection_reason', COALESCE(NEW.rejection_reason, ''))
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_profile_rejected ON public.profiles;
CREATE TRIGGER trg_notify_profile_rejected
  AFTER UPDATE OF approval_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_profile_rejected();

-- 4. Trigger: Application accepted
CREATE OR REPLACE FUNCTION notify_application_accepted()
RETURNS TRIGGER AS $$
DECLARE
  req_title TEXT;
  biz_name TEXT;
BEGIN
  IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
    SELECT r.title, COALESCE(p.business_name, p.full_name)
    INTO req_title, biz_name
    FROM requirements r
    JOIN profiles p ON p.id = r.business_id
    WHERE r.id = NEW.requirement_id;

    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      NEW.creator_id,
      'application_accepted',
      'Your application was accepted!',
      biz_name || ' accepted your application for "' || req_title || '". Check your deals for next steps.',
      jsonb_build_object('requirement_id', NEW.requirement_id, 'application_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_application_accepted ON public.applications;
CREATE TRIGGER trg_notify_application_accepted
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_accepted();

-- 5. Trigger: Application rejected
CREATE OR REPLACE FUNCTION notify_application_rejected()
RETURNS TRIGGER AS $$
DECLARE
  req_title TEXT;
  biz_name TEXT;
BEGIN
  IF OLD.status != 'rejected' AND NEW.status = 'rejected' THEN
    SELECT r.title, COALESCE(p.business_name, p.full_name)
    INTO req_title, biz_name
    FROM requirements r
    JOIN profiles p ON p.id = r.business_id
    WHERE r.id = NEW.requirement_id;

    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      NEW.creator_id,
      'application_rejected',
      'Application update',
      'Your application for "' || req_title || '" by ' || biz_name || ' was not selected this time.',
      jsonb_build_object('requirement_id', NEW.requirement_id, 'application_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_application_rejected ON public.applications;
CREATE TRIGGER trg_notify_application_rejected
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_rejected();

-- 6. Trigger: Deal completed
CREATE OR REPLACE FUNCTION notify_deal_completed()
RETURNS TRIGGER AS $$
DECLARE
  req_title TEXT;
  biz_name TEXT;
  creator_name TEXT;
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    SELECT r.title INTO req_title
    FROM requirements r WHERE r.id = NEW.requirement_id;

    SELECT COALESCE(p.business_name, p.full_name) INTO biz_name
    FROM profiles p WHERE p.id = NEW.business_id;

    SELECT p.full_name INTO creator_name
    FROM profiles p WHERE p.id = NEW.creator_id;

    -- Notify creator
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      NEW.creator_id,
      'deal_completed',
      'Deal completed!',
      'Your collaboration with ' || biz_name || ' for "' || req_title || '" has been completed. Don''t forget to leave a rating!',
      jsonb_build_object('deal_id', NEW.id)
    );

    -- Notify business
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      NEW.business_id,
      'deal_completed',
      'Deal completed!',
      'Your collaboration with ' || creator_name || ' for "' || req_title || '" has been completed. Don''t forget to leave a rating!',
      jsonb_build_object('deal_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_deal_completed ON public.deals;
CREATE TRIGGER trg_notify_deal_completed
  AFTER UPDATE OF status ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION notify_deal_completed();

-- ============================================================
-- To actually send emails, create a Supabase Edge Function
-- that listens to inserts on the notifications table
-- (via database webhook or pg_net) and sends emails via
-- Resend, SendGrid, or similar service.
--
-- Example Edge Function trigger:
-- supabase functions deploy send-notification-email
-- ============================================================
