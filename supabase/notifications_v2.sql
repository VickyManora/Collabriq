-- ============================================================
-- Collabriq — Notification System v2 (Migration)
-- Run this in Supabase SQL Editor AFTER notifications.sql
-- Adds: user_rejected, application_withdrawn, deal_created,
--        creator_marked_done, business_marked_done
-- Also adds email trigger via pg_net (optional)
-- ============================================================


-- 1. ADD NEW ENUM VALUES
-- ============================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'user_rejected';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'application_withdrawn';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'deal_created';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'creator_marked_done';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'business_marked_done';


-- 2. NEW TRIGGER FUNCTIONS
-- ============================================================

-- 2.1 User rejected (includes rejection reason)
CREATE OR REPLACE FUNCTION public.notify_user_rejected()
RETURNS TRIGGER AS $$
DECLARE
  v_message TEXT;
BEGIN
  IF NEW.approval_status = 'rejected' AND OLD.approval_status IS DISTINCT FROM 'rejected' THEN
    v_message := 'Your profile was not approved.';
    IF NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason != '' THEN
      v_message := v_message || ' Reason: ' || NEW.rejection_reason;
    END IF;
    v_message := v_message || ' Please update your profile and resubmit for review.';

    INSERT INTO public.notifications (user_id, type, message)
    VALUES (NEW.id, 'user_rejected', v_message);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 Application withdrawn (notify business)
CREATE OR REPLACE FUNCTION public.notify_application_withdrawn()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_name TEXT;
  v_req_title TEXT;
  v_business_id UUID;
BEGIN
  IF NEW.status = 'withdrawn' AND OLD.status IS DISTINCT FROM 'withdrawn' THEN
    SELECT p.full_name INTO v_creator_name
    FROM public.profiles p WHERE p.id = NEW.creator_id;

    SELECT r.title, r.business_id INTO v_req_title, v_business_id
    FROM public.requirements r WHERE r.id = NEW.requirement_id;

    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      v_business_id,
      'application_withdrawn',
      v_creator_name || ' withdrew their application to "' || v_req_title || '".'
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 Deal created (notify both business and creator)
CREATE OR REPLACE FUNCTION public.notify_deal_created()
RETURNS TRIGGER AS $$
DECLARE
  v_req_title TEXT;
  v_business_name TEXT;
  v_creator_name TEXT;
BEGIN
  SELECT r.title INTO v_req_title
  FROM public.requirements r WHERE r.id = NEW.requirement_id;

  SELECT COALESCE(p.business_name, p.full_name) INTO v_business_name
  FROM public.profiles p WHERE p.id = NEW.business_id;

  SELECT p.full_name INTO v_creator_name
  FROM public.profiles p WHERE p.id = NEW.creator_id;

  -- Notify creator
  INSERT INTO public.notifications (user_id, type, message)
  VALUES (
    NEW.creator_id,
    'deal_created',
    'You have a new deal with ' || v_business_name || ' for "' || v_req_title || '"!'
  );

  -- Notify business
  INSERT INTO public.notifications (user_id, type, message)
  VALUES (
    NEW.business_id,
    'deal_created',
    'New deal started with ' || v_creator_name || ' for "' || v_req_title || '".'
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.4 Creator marked done (notify business)
CREATE OR REPLACE FUNCTION public.notify_creator_marked_done()
RETURNS TRIGGER AS $$
DECLARE
  v_req_title TEXT;
  v_creator_name TEXT;
BEGIN
  IF NEW.creator_marked_done = TRUE AND OLD.creator_marked_done = FALSE THEN
    SELECT r.title INTO v_req_title
    FROM public.requirements r WHERE r.id = NEW.requirement_id;

    SELECT p.full_name INTO v_creator_name
    FROM public.profiles p WHERE p.id = NEW.creator_id;

    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      NEW.business_id,
      'creator_marked_done',
      v_creator_name || ' marked the deal for "' || v_req_title || '" as done. Please review and confirm.'
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.5 Business marked done (notify creator)
CREATE OR REPLACE FUNCTION public.notify_business_marked_done()
RETURNS TRIGGER AS $$
DECLARE
  v_req_title TEXT;
  v_business_name TEXT;
BEGIN
  IF NEW.business_marked_done = TRUE AND OLD.business_marked_done = FALSE THEN
    SELECT r.title INTO v_req_title
    FROM public.requirements r WHERE r.id = NEW.requirement_id;

    SELECT COALESCE(p.business_name, p.full_name) INTO v_business_name
    FROM public.profiles p WHERE p.id = NEW.business_id;

    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      NEW.creator_id,
      'business_marked_done',
      v_business_name || ' confirmed the deal for "' || v_req_title || '" as done.'
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. NEW TRIGGERS (drop first for idempotent re-runs)
-- ============================================================

DROP TRIGGER IF EXISTS notify_on_user_rejected ON public.profiles;
CREATE TRIGGER notify_on_user_rejected
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_rejected();

DROP TRIGGER IF EXISTS notify_on_application_withdrawn ON public.applications;
CREATE TRIGGER notify_on_application_withdrawn
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_withdrawn();

DROP TRIGGER IF EXISTS notify_on_deal_created ON public.deals;
CREATE TRIGGER notify_on_deal_created
  AFTER INSERT ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.notify_deal_created();

DROP TRIGGER IF EXISTS notify_on_creator_marked_done ON public.deals;
CREATE TRIGGER notify_on_creator_marked_done
  AFTER UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.notify_creator_marked_done();

DROP TRIGGER IF EXISTS notify_on_business_marked_done ON public.deals;
CREATE TRIGGER notify_on_business_marked_done
  AFTER UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.notify_business_marked_done();


-- 4. ENABLE REALTIME FOR NOTIFICATIONS
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;


-- 5. EMAIL NOTIFICATION FUNCTION (uses pg_net extension)
-- ============================================================
-- This function sends an HTTP POST to a Supabase Edge Function
-- whenever a notification is created for email-worthy events.
-- Enable pg_net extension first: CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- Replace YOUR_SUPABASE_URL and YOUR_ANON_KEY with actual values.
-- ============================================================

-- Uncomment and configure when Edge Function is deployed:
/*
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_edge_url TEXT := 'YOUR_SUPABASE_URL/functions/v1/send-notification-email';
  v_anon_key TEXT := 'YOUR_ANON_KEY';
BEGIN
  -- Only send emails for specific notification types
  IF NEW.type NOT IN (
    'user_approved', 'user_rejected', 'application_accepted',
    'deal_created', 'deal_completed'
  ) THEN
    RETURN NULL;
  END IF;

  -- Get user email
  SELECT au.email INTO v_user_email
  FROM auth.users au WHERE au.id = NEW.user_id;

  SELECT p.full_name INTO v_user_name
  FROM public.profiles p WHERE p.id = NEW.user_id;

  -- Call Edge Function via pg_net
  PERFORM extensions.http_post(
    url := v_edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'to', v_user_email,
      'name', v_user_name,
      'type', NEW.type::TEXT,
      'message', NEW.message
    )
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER send_email_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.send_notification_email();
*/
