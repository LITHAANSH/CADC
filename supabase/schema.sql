-- ========================================================
-- CADC — Supabase PostgreSQL Database Schema & Migration
-- ========================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------
-- 1. PROFILES TABLE (User & Student Accounts)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  education_background TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'client', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for email & role queries
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- --------------------------------------------------------
-- 2. INQUIRIES & TOUCHPOINT BOOKINGS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inquiries (
  id TEXT PRIMARY KEY DEFAULT ('REQ-' || floor(100000 + random() * 900000)::text),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL DEFAULT 'General Enquiry',
  form_type TEXT NOT NULL DEFAULT 'Homepage Quick Enquiry',
  preferred_call_time TEXT NOT NULL DEFAULT 'Anytime',
  touchpoint_channel TEXT NOT NULL DEFAULT 'Phone Call',
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'contacted', 'converted', 'archived')),
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for inquiry search and filtering
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries (status);
CREATE INDEX IF NOT EXISTS idx_inquiries_form_type ON public.inquiries (form_type);

-- --------------------------------------------------------
-- 3. COURSES CATALOG TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tagline TEXT,
  category TEXT NOT NULL CHECK (category IN ('foundations', 'aerospace', 'automotive', 'advanced')),
  level TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL DEFAULT 8,
  tools TEXT[] NOT NULL DEFAULT ARRAY['CATIA V5-6R'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Initial Course Catalog
INSERT INTO public.courses (id, title, tagline, category, level, duration_weeks, tools)
VALUES
  ('CRS-01', 'CATIA V5 Foundations & Mechanical Part Design', 'Master Sketcher, Part Design, and Technical Drafting from zero.', 'foundations', 'Beginner to Intermediate', 6, ARRAY['CATIA V5 Part Design', 'Generative Drafting']),
  ('CRS-02', 'Aerospace BIW & Structural Sheet Metal Design', 'Design flight-ready wing ribs, fuselage frames, and brackets.', 'aerospace', 'Intermediate to Advanced', 8, ARRAY['Aerospace Sheet Metal', 'GSD Surface Design', 'GD&T ASME Y14.5']),
  ('CRS-03', 'Automotive Plastics & Generative Surface Design (GSD)', 'A-Class curvature, plastic trim, ribs, bosses, and tooling feasibility.', 'automotive', 'Advanced', 8, ARRAY['Generative Shape Design (GSD)', 'Plastic Part Feasibility', 'Draft Analysis']),
  ('CRS-04', 'DMU Kinematics, Mechanism Simulation & Wire Harness Routing', 'Multi-body motion analysis, interference checks, and EHI routing.', 'advanced', 'Specialist', 6, ARRAY['DMU Kinematics', 'Electrical Wire Harness (EHI)', 'DMU Space Analysis'])
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------
-- 4. COURSE ENROLLMENTS / APPLICATIONS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES public.courses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'cancelled')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completion_percentage INTEGER NOT NULL DEFAULT 0
);

-- --------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if requesting user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles"
  ON public.profiles FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Inquiries Policies
CREATE POLICY "Anyone can insert an inquiry"
  ON public.inquiries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all inquiries"
  ON public.inquiries FOR SELECT
  USING (public.is_admin() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can update inquiries"
  ON public.inquiries FOR UPDATE
  USING (public.is_admin() OR auth.jwt() ->> 'role' = 'service_role');

-- Courses Policies
CREATE POLICY "Courses are publicly readable"
  ON public.courses FOR SELECT
  USING (is_active = true OR public.is_admin());

-- Enrollments Policies
CREATE POLICY "Students can view their own enrollments"
  ON public.course_enrollments FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Students can apply for courses"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- --------------------------------------------------------
-- 6. AUTH USER SYNC TRIGGER
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, education_background, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Student User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'education_background', NEW.raw_user_meta_data->>'education', 'Engineering'),
    CASE
      WHEN NEW.email = 'lithaansh06@gmail.com' THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    education_background = EXCLUDED.education_background;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
