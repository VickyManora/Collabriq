-- ============================================================
-- Collabriq — Notification System
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- 1. ENUM
-- ============================================================

CREATE TYPE public.notification_type AS ENUM (
  'user_approved',
  'requirement_approved',
  'application_received',
  'application_accepted',
  'application_rejected',
  'deal_completed'
);


-- 2. TABLE
-- ============================================================

CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       public.notification_type NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX idx_notifications_unread
  ON public.notifications(user_id)
  WHERE is_read = FALSE;


-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 4. TRIGGER FUNCTIONS (all SECURITY DEFINER — insert bypasses RLS)
-- ============================================================

-- 4.1 User approved
CREATE OR REPLACE FUNCTION public.notify_user_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND OLD.approval_status IS DISTINCT FROM 'approved' THEN
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      NEW.id,
      'user_approved',
      'Your account has been approved! You can now start using Collabriq.'
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 Requirement approved
CREATE OR REPLACE FUNCTION public.notify_requirement_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' AND OLD.status = 'pending_approval' THEN
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      NEW.business_id,
      'requirement_approved',
      'Your requirement "' || NEW.title || '" has been approved and is now live.'
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Application received
CREATE OR REPLACE FUNCTION public.notify_application_received()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_name TEXT;
  v_req_title TEXT;
  v_business_id UUID;
BEGIN
  SELECT p.full_name INTO v_creator_name
  FROM public.profiles p WHERE p.id = NEW.creator_id;

  SELECT r.title, r.business_id INTO v_req_title, v_business_id
  FROM public.requirements r WHERE r.id = NEW.requirement_id;

  INSERT INTO public.notifications (user_id, type, message)
  VALUES (
    v_business_id,
    'application_received',
    v_creator_name || ' applied to "' || v_req_title || '".'
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 Application accepted
CREATE OR REPLACE FUNCTION public.notify_application_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_req_title TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    SELECT r.title INTO v_req_title
    FROM public.requirements r WHERE r.id = NEW.requirement_id;

    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      NEW.creator_id,
      'application_accepted',
      'Your application to "' || v_req_title || '" has been accepted!'
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.5 Application rejected
CREATE OR REPLACE FUNCTION public.notify_application_rejected()
RETURNS TRIGGER AS $$
DECLARE
  v_req_title TEXT;
BEGIN
  IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    SELECT r.title INTO v_req_title
    FROM public.requirements r WHERE r.id = NEW.requirement_id;

    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      NEW.creator_id,
      'application_rejected',
      'Your application to "' || v_req_title || '" was not accepted.'
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.6 Deal completed
CREATE OR REPLACE FUNCTION public.notify_deal_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_req_title TEXT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT r.title INTO v_req_title
    FROM public.requirements r WHERE r.id = NEW.requirement_id;

    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      NEW.business_id,
      'deal_completed',
      'Deal for "' || v_req_title || '" has been completed.'
    );

    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      NEW.creator_id,
      'deal_completed',
      'Deal for "' || v_req_title || '" has been completed.'
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. TRIGGERS (all AFTER — no changes to existing BEFORE triggers)
-- ============================================================

CREATE TRIGGER notify_on_user_approved
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_approved();

CREATE TRIGGER notify_on_requirement_approved
  AFTER UPDATE ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION public.notify_requirement_approved();

CREATE TRIGGER notify_on_application_received
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_received();

CREATE TRIGGER notify_on_application_accepted
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_accepted();

CREATE TRIGGER notify_on_application_rejected
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_rejected();

CREATE TRIGGER notify_on_deal_completed
  AFTER UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.notify_deal_completed();
