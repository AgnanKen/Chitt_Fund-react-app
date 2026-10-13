-- ====================================================================
-- LEDGERONE - SUPABASE AUTH, ROLES & SECURITY MIGRATION (PRODUCTION LIVE)
-- Run this in Supabase SQL Editor
-- ====================================================================

-- 0. PREREQUISITES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. SCHEME ENROLLMENTS TABLE (Tracks which member is enrolled in which scheme)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.scheme_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    scheme_id UUID NOT NULL REFERENCES public.chit_schemes(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(member_id, scheme_id)
);

ALTER TABLE public.scheme_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enrollments_read" ON public.scheme_enrollments;
DROP POLICY IF EXISTS "enrollments_insert" ON public.scheme_enrollments;
DROP POLICY IF EXISTS "enrollments_manage" ON public.scheme_enrollments;

CREATE POLICY "enrollments_read" ON public.scheme_enrollments FOR SELECT USING (true);
CREATE POLICY "enrollments_insert" ON public.scheme_enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "enrollments_manage" ON public.scheme_enrollments FOR ALL USING (true);


-- ====================================================================
-- 2. PROFILES TABLE (links auth.users → roles + member data)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    avatar_initials VARCHAR(4),
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ====================================================================
-- 3. AUTO-CREATE PROFILE & MEMBER ON NEW AUTH USER (Trigger)
-- Creates a real member record starting from ZERO for every new user!
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_member_id UUID;
    v_full_name TEXT;
    v_phone TEXT;
    v_role TEXT;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    v_phone := NEW.raw_user_meta_data->>'phone';
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');

    -- Check if member already exists with this email
    SELECT id INTO v_member_id FROM public.members WHERE email = NEW.email LIMIT 1;

    -- If not, create a new clean member record starting from zero!
    IF v_member_id IS NULL THEN
        INSERT INTO public.members (
            full_name,
            email,
            phone,
            kyc_status,
            role,
            avatar_initials,
            total_invested,
            chits_enrolled
        ) VALUES (
            v_full_name,
            NEW.email,
            v_phone,
            'Approved',
            INITCAP(v_role),
            UPPER(LEFT(v_full_name, 2)),
            0,
            0
        ) RETURNING id INTO v_member_id;
    END IF;

    -- Insert or update profile linked to this member record
    INSERT INTO public.profiles (id, email, full_name, role, avatar_initials, member_id)
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_role,
        UPPER(LEFT(v_full_name, 2)),
        v_member_id
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        member_id = COALESCE(v_member_id, public.profiles.member_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ====================================================================
-- 4. HELPER FUNCTIONS (SECURITY DEFINER to prevent RLS recursion)
-- ====================================================================

-- Returns true if current logged-in user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Returns the current logged-in user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Returns the current logged-in user's linked member_id
CREATE OR REPLACE FUNCTION public.get_my_member_id()
RETURNS UUID AS $$
    SELECT member_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;


-- ====================================================================
-- 5. RLS POLICIES — ALL TABLES
-- ====================================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_update" ON public.profiles
    FOR UPDATE USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_insert" ON public.profiles
    FOR INSERT WITH CHECK (true);


-- MEMBERS TABLE
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_read" ON public.members;
DROP POLICY IF EXISTS "members_insert" ON public.members;
DROP POLICY IF EXISTS "members_update" ON public.members;
DROP POLICY IF EXISTS "members_manage_admin" ON public.members;

CREATE POLICY "members_read" ON public.members
    FOR SELECT USING (true);

CREATE POLICY "members_insert" ON public.members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "members_update" ON public.members
    FOR UPDATE USING (true);


-- PAYMENTS TABLE
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_read" ON public.payments;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_update" ON public.payments;
DROP POLICY IF EXISTS "payments_manage_admin" ON public.payments;

CREATE POLICY "payments_read" ON public.payments
    FOR SELECT USING (true);

CREATE POLICY "payments_insert" ON public.payments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "payments_update" ON public.payments
    FOR UPDATE USING (true);


-- CHIT SCHEMES TABLE
ALTER TABLE public.chit_schemes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chit_schemes_read" ON public.chit_schemes;
DROP POLICY IF EXISTS "chit_schemes_manage_admin" ON public.chit_schemes;

CREATE POLICY "chit_schemes_read" ON public.chit_schemes FOR SELECT USING (true);
CREATE POLICY "chit_schemes_manage_admin" ON public.chit_schemes FOR ALL USING (true);


-- AUCTIONS & BIDS TABLES
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auctions_read" ON public.auctions;
DROP POLICY IF EXISTS "auctions_manage_admin" ON public.auctions;

CREATE POLICY "auctions_read" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "auctions_manage_admin" ON public.auctions FOR ALL USING (true);

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bids_read" ON public.bids;
DROP POLICY IF EXISTS "bids_insert" ON public.bids;

CREATE POLICY "bids_read" ON public.bids FOR SELECT USING (true);
CREATE POLICY "bids_insert" ON public.bids FOR INSERT WITH CHECK (true);


-- ACTIVITIES TABLE
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activities_read" ON public.activities;
DROP POLICY IF EXISTS "activities_insert" ON public.activities;
DROP POLICY IF EXISTS "activities_manage_admin" ON public.activities;

CREATE POLICY "activities_read" ON public.activities FOR SELECT USING (true);
CREATE POLICY "activities_insert" ON public.activities FOR INSERT WITH CHECK (true);
CREATE POLICY "activities_manage_admin" ON public.activities FOR ALL USING (true);


-- ====================================================================
-- 6. REALTIME PUBLICATION
-- ====================================================================

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scheme_enrollments;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;
