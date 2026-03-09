-- ============================================================
-- Collabriq MVP — Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. ENUMS
-- ============================================================

CREATE TYPE public.user_role AS ENUM ('creator', 'business', 'admin');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.requirement_status AS ENUM (
  'draft', 'pending_approval', 'open', 'partially_filled', 'closed', 'cancelled'
);
CREATE TYPE public.application_status AS ENUM ('applied', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE public.deal_status AS ENUM ('active', 'creator_marked_done', 'completed', 'cancelled');


-- 2. UTILITY FUNCTION (no table dependency)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 3. TABLES
-- ============================================================

-- Profiles
CREATE TABLE public.profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role              public.user_role NOT NULL,
  approval_status   public.approval_status NOT NULL DEFAULT 'pending',
  email             TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  bio               TEXT,
  city              TEXT DEFAULT 'Pune',
  business_name     TEXT,
  business_category TEXT,
  instagram_handle  TEXT,
  portfolio_url     TEXT,
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role) WHERE is_deleted = FALSE;
CREATE INDEX idx_profiles_approval ON public.profiles(approval_status) WHERE is_deleted = FALSE;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Requirements
CREATE TABLE public.requirements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES public.profiles(id),
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  category              TEXT,
  creator_slots         INTEGER NOT NULL DEFAULT 1 CHECK (creator_slots >= 1 AND creator_slots <= 10),
  filled_slots          INTEGER NOT NULL DEFAULT 0,
  status                public.requirement_status NOT NULL DEFAULT 'draft',
  compensation_details  TEXT,
  location              TEXT DEFAULT 'Pune',
  opened_at             TIMESTAMPTZ,
  closes_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_requirements_business ON public.requirements(business_id);
CREATE INDEX idx_requirements_status ON public.requirements(status);
CREATE INDEX idx_requirements_closes_at ON public.requirements(closes_at)
  WHERE status IN ('open', 'partially_filled');

-- Applications
CREATE TABLE public.applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id  UUID NOT NULL REFERENCES public.requirements(id),
  creator_id      UUID NOT NULL REFERENCES public.profiles(id),
  status          public.application_status NOT NULL DEFAULT 'applied',
  pitch           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requirement_id, creator_id)
);

CREATE INDEX idx_applications_requirement ON public.applications(requirement_id);
CREATE INDEX idx_applications_creator ON public.applications(creator_id);
CREATE INDEX idx_applications_status ON public.applications(status);

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Deals
CREATE TABLE public.deals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id      UUID NOT NULL REFERENCES public.requirements(id),
  application_id      UUID NOT NULL REFERENCES public.applications(id),
  business_id         UUID NOT NULL REFERENCES public.profiles(id),
  creator_id          UUID NOT NULL REFERENCES public.profiles(id),
  status              public.deal_status NOT NULL DEFAULT 'active',
  creator_marked_done BOOLEAN NOT NULL DEFAULT FALSE,
  business_marked_done BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at        TIMESTAMPTZ,
  cancelled_by        TEXT CHECK (cancelled_by IN ('business', 'creator', 'admin')),
  content_proof_url   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deals_business ON public.deals(business_id);
CREATE INDEX idx_deals_creator ON public.deals(creator_id);
CREATE INDEX idx_deals_status ON public.deals(status);

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ratings
CREATE TABLE public.ratings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id     UUID NOT NULL REFERENCES public.deals(id),
  rater_id    UUID NOT NULL REFERENCES public.profiles(id),
  ratee_id    UUID NOT NULL REFERENCES public.profiles(id),
  stars       INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id, rater_id)
);

CREATE INDEX idx_ratings_ratee ON public.ratings(ratee_id);


-- 4. HELPER FUNCTIONS (depend on profiles table)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_deleted = FALSE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN AS $$
  SELECT approval_status = 'approved'
  FROM public.profiles
  WHERE id = auth.uid() AND is_deleted = FALSE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- 5. TRIGGERS & BUSINESS LOGIC
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, business_name, instagram_handle)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'creator'),
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'instagram_handle'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Requirement status change logic
CREATE OR REPLACE FUNCTION public.handle_requirement_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' AND (OLD.status IS DISTINCT FROM 'open') THEN
    NEW.opened_at = now();
    NEW.closes_at = now() + INTERVAL '15 days';
  END IF;

  IF NEW.filled_slots > 0 AND NEW.filled_slots < NEW.creator_slots
     AND NEW.status = 'open' THEN
    NEW.status = 'partially_filled';
  END IF;

  IF NEW.filled_slots >= NEW.creator_slots
     AND NEW.status IN ('open', 'partially_filled') THEN
    NEW.status = 'closed';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER requirements_status_change
  BEFORE UPDATE ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION public.handle_requirement_status_change();

-- Enforce max 3 active requirements per business
CREATE OR REPLACE FUNCTION public.check_active_requirement_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  IF NEW.status IN ('pending_approval', 'open', 'partially_filled') THEN
    SELECT COUNT(*) INTO active_count
    FROM public.requirements
    WHERE business_id = NEW.business_id
      AND status IN ('pending_approval', 'open', 'partially_filled')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    IF active_count >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 active requirements allowed per business';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_active_requirement_limit
  BEFORE INSERT OR UPDATE ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION public.check_active_requirement_limit();

-- On application accepted: increment filled_slots and create deal
CREATE OR REPLACE FUNCTION public.handle_application_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'applied' THEN
    UPDATE public.requirements
    SET filled_slots = filled_slots + 1
    WHERE id = NEW.requirement_id;

    INSERT INTO public.deals (requirement_id, application_id, business_id, creator_id)
    SELECT NEW.requirement_id, NEW.id, r.business_id, NEW.creator_id
    FROM public.requirements r
    WHERE r.id = NEW.requirement_id;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER application_accepted
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_application_accepted();

-- Dual confirmation deal completion
CREATE OR REPLACE FUNCTION public.handle_deal_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.creator_marked_done = TRUE AND OLD.creator_marked_done = FALSE THEN
    NEW.status = 'creator_marked_done';
  END IF;

  IF NEW.creator_marked_done = TRUE AND NEW.business_marked_done = TRUE THEN
    NEW.status = 'completed';
    NEW.completed_at = now();
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deal_completion
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_deal_completion();


-- 6. ROW LEVEL SECURITY
-- ============================================================

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read non-deleted profiles"
  ON public.profiles FOR SELECT
  USING (is_deleted = FALSE);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- Requirements RLS
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users read open requirements"
  ON public.requirements FOR SELECT
  USING (
    status IN ('open', 'partially_filled')
    AND public.is_approved()
  );

CREATE POLICY "Business reads own requirements"
  ON public.requirements FOR SELECT
  USING (business_id = auth.uid());

CREATE POLICY "Admins read all requirements"
  ON public.requirements FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Business can create requirements"
  ON public.requirements FOR INSERT
  WITH CHECK (
    business_id = auth.uid()
    AND public.get_my_role() = 'business'
    AND public.is_approved()
  );

CREATE POLICY "Business can update own requirements"
  ON public.requirements FOR UPDATE
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

CREATE POLICY "Admins can update any requirement"
  ON public.requirements FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- Applications RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator reads own applications"
  ON public.applications FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Business reads applications to own requirements"
  ON public.applications FOR SELECT
  USING (
    requirement_id IN (
      SELECT id FROM public.requirements WHERE business_id = auth.uid()
    )
  );

CREATE POLICY "Admins read all applications"
  ON public.applications FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Creator can apply"
  ON public.applications FOR INSERT
  WITH CHECK (
    creator_id = auth.uid()
    AND public.get_my_role() = 'creator'
    AND public.is_approved()
  );

CREATE POLICY "Creator can update own application"
  ON public.applications FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Business can update applications to own requirements"
  ON public.applications FOR UPDATE
  USING (
    requirement_id IN (
      SELECT id FROM public.requirements WHERE business_id = auth.uid()
    )
  );

-- Deals RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal parties can read"
  ON public.deals FOR SELECT
  USING (business_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY "Admins read all deals"
  ON public.deals FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Deal parties can update"
  ON public.deals FOR UPDATE
  USING (business_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY "Admins can update deals"
  ON public.deals FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- Ratings RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ratings"
  ON public.ratings FOR SELECT
  USING (TRUE);

CREATE POLICY "Deal parties can rate on active deals"
  ON public.ratings FOR INSERT
  WITH CHECK (
    rater_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.deals
      WHERE deals.id = deal_id
        AND deals.status IN ('active', 'creator_marked_done', 'completed')
        AND (deals.business_id = auth.uid() OR deals.creator_id = auth.uid())
    )
  );


-- 7. CONTACT DETAILS FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_contact_details(target_user_id UUID)
RETURNS TABLE(email TEXT, phone TEXT) AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.deals
    WHERE status IN ('active', 'creator_marked_done', 'completed')
      AND (
        (business_id = auth.uid() AND creator_id = target_user_id)
        OR (creator_id = auth.uid() AND business_id = target_user_id)
      )
  ) THEN
    RETURN QUERY
      SELECT p.email, p.phone
      FROM public.profiles p
      WHERE p.id = target_user_id AND p.is_deleted = FALSE;
  ELSE
    RAISE EXCEPTION 'Not authorized to view contact details';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
