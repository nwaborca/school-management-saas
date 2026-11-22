-- ==============================================================================
-- AEGIS SCHOOL MANAGEMENT SAAS - COMPREHENSIVE RLS POLICIES & SEED SCRIPT
-- MULTI-TENANT UPGRADE (PHASE 1) IDEMPOTENT RUNNER
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/omfmkvvyyazikdbcsotd/sql/new
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. SCHOOLS TABLE (Core Tenant Entity)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 150,
  logo_url TEXT NULL,
  bank_name TEXT NULL,
  account_number VARCHAR(20) NULL,
  account_name TEXT NULL,
  access_status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (access_status IN ('PENDING_APPROVAL', 'ACTIVE', 'TERM_EXPIRED')),
  plan_label TEXT NOT NULL DEFAULT 'FREE_PILOT_TERM' CHECK (plan_label IN ('FREE_PILOT_TERM', 'ACTIVE_TERM')),
  access_expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was already created earlier
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.schools ADD COLUMN logo_url TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE public.schools ADD COLUMN bank_name TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE public.schools ADD COLUMN account_number VARCHAR(20) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'account_name'
  ) THEN
    ALTER TABLE public.schools ADD COLUMN account_name TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'access_status'
  ) THEN
    ALTER TABLE public.schools ADD COLUMN access_status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'plan_label'
  ) THEN
    ALTER TABLE public.schools ADD COLUMN plan_label TEXT NOT NULL DEFAULT 'FREE_PILOT_TERM';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schools' AND column_name = 'access_expires_at'
  ) THEN
    ALTER TABLE public.schools ADD COLUMN access_expires_at TIMESTAMPTZ NULL;
  END IF;
END $$;

-- Seed default school tenant safely (permanently ACTIVE)
DO $$
DECLARE
  v_default_school_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN
  INSERT INTO public.schools (id, name, invite_code, latitude, longitude, geofence_radius_meters, access_status, plan_label, access_expires_at)
  VALUES (
    v_default_school_id,
    'Aegis Academy Nigeria',
    'AEGIS-2026',
    6.5244,
    3.3792,
    150,
    'ACTIVE',
    'ACTIVE_TERM',
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    invite_code = EXCLUDED.invite_code,
    latitude = COALESCE(public.schools.latitude, EXCLUDED.latitude),
    longitude = COALESCE(public.schools.longitude, EXCLUDED.longitude),
    geofence_radius_meters = EXCLUDED.geofence_radius_meters,
    access_status = 'ACTIVE',
    plan_label = 'ACTIVE_TERM';
END $$;

-- ==============================================================================
-- 3. ENSURE school_id ON ALL TENANT TABLES
-- ==============================================================================

-- A. CLASSES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE public.classes ADD COLUMN school_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;
END $$;

UPDATE public.classes 
SET school_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE school_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_classes_school'
  ) THEN
    ALTER TABLE public.classes 
      ADD CONSTRAINT fk_classes_school 
      FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes(school_id);

-- B. STAFF
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE public.staff ADD COLUMN school_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;
END $$;

UPDATE public.staff 
SET school_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE school_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_staff_school'
  ) THEN
    ALTER TABLE public.staff 
      ADD CONSTRAINT fk_staff_school 
      FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_school_id ON public.staff(school_id);

-- C. STUDENTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE public.students ADD COLUMN school_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;
END $$;

UPDATE public.students 
SET school_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE school_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_students_school'
  ) THEN
    ALTER TABLE public.students 
      ADD CONSTRAINT fk_students_school 
      FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_class ON public.students(school_id, class_id);

-- D. SUBJECTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE public.subjects ADD COLUMN school_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;
END $$;

UPDATE public.subjects 
SET school_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE school_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_subjects_school'
  ) THEN
    ALTER TABLE public.subjects 
      ADD CONSTRAINT fk_subjects_school 
      FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON public.subjects(school_id);

-- E. FEE_STRUCTURES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'fee_structures' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE public.fee_structures ADD COLUMN school_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;
END $$;

UPDATE public.fee_structures 
SET school_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE school_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_structures_school'
  ) THEN
    ALTER TABLE public.fee_structures 
      ADD CONSTRAINT fk_fee_structures_school 
      FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fee_structures_school_id ON public.fee_structures(school_id);

-- F. RECEIPTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE public.receipts ADD COLUMN school_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;
END $$;

UPDATE public.receipts 
SET school_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE school_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_receipts_school'
  ) THEN
    ALTER TABLE public.receipts 
      ADD CONSTRAINT fk_receipts_school 
      FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_receipts_school_id ON public.receipts(school_id);

-- G. TERM_RESULTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'term_results' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE public.term_results ADD COLUMN school_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;
END $$;

UPDATE public.term_results 
SET school_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE school_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_term_results_school'
  ) THEN
    ALTER TABLE public.term_results 
      ADD CONSTRAINT fk_term_results_school 
      FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_term_results_school_id ON public.term_results(school_id);
CREATE INDEX IF NOT EXISTS idx_term_results_school_student ON public.term_results(school_id, student_id);

-- ==============================================================================
-- 4. NEW TABLES: STAFF ATTENDANCE & PICKUP PASSES
-- ==============================================================================

-- A. STAFF_ATTENDANCE
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out_time TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'LATE', 'HALF_DAY', 'ABSENT')),
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  distance_meters DOUBLE PRECISION NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_school_id ON public.staff_attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_teacher_id ON public.staff_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_check_in ON public.staff_attendance(school_id, check_in_time);

-- B. PICKUP_PASSES
CREATE TABLE IF NOT EXISTS public.pickup_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  pass_type TEXT NOT NULL CHECK (pass_type IN ('DAILY_PARENT', 'DELEGATE_5H')),
  delegate_name TEXT NULL,
  otp_code TEXT NOT NULL,
  qr_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'RELEASED_AT_GATE', 'EXPIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  picked_up_at TIMESTAMPTZ NULL,
  verified_by_staff_id UUID NULL REFERENCES public.staff(id) ON DELETE SET NULL,
  gate_released_at TIMESTAMPTZ NULL,
  released_by_security_id UUID NULL REFERENCES public.staff(id) ON DELETE SET NULL
);

-- Ensure gate release columns and check constraint exist if table already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pickup_passes' AND column_name = 'gate_released_at'
  ) THEN
    ALTER TABLE public.pickup_passes ADD COLUMN gate_released_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pickup_passes' AND column_name = 'released_by_security_id'
  ) THEN
    ALTER TABLE public.pickup_passes ADD COLUMN released_by_security_id UUID NULL REFERENCES public.staff(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pickup_passes_school_id ON public.pickup_passes(school_id);
CREATE INDEX IF NOT EXISTS idx_pickup_passes_student_id ON public.pickup_passes(student_id);
CREATE INDEX IF NOT EXISTS idx_pickup_passes_otp ON public.pickup_passes(school_id, otp_code);
CREATE INDEX IF NOT EXISTS idx_pickup_passes_status ON public.pickup_passes(school_id, status);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE IF EXISTS public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.term_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pickup_passes ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS policies granting full access for client compatibility
DROP POLICY IF EXISTS "Allow public select on schools" ON public.schools;
DROP POLICY IF EXISTS "Allow public insert on schools" ON public.schools;
DROP POLICY IF EXISTS "Allow public update on schools" ON public.schools;
DROP POLICY IF EXISTS "Allow public delete on schools" ON public.schools;
CREATE POLICY "Allow public select on schools" ON public.schools FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on schools" ON public.schools FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on schools" ON public.schools FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete on schools" ON public.schools FOR DELETE TO public USING (true);

DROP POLICY IF EXISTS "Allow full access on staff" ON public.staff;
CREATE POLICY "Allow full access on staff" ON public.staff FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access on students" ON public.students;
CREATE POLICY "Allow full access on students" ON public.students FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access on classes" ON public.classes;
CREATE POLICY "Allow full access on classes" ON public.classes FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access on subjects" ON public.subjects;
CREATE POLICY "Allow full access on subjects" ON public.subjects FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access on term_results" ON public.term_results;
CREATE POLICY "Allow full access on term_results" ON public.term_results FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access on receipts" ON public.receipts;
CREATE POLICY "Allow full access on receipts" ON public.receipts FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access on fee_structures" ON public.fee_structures;
CREATE POLICY "Allow full access on fee_structures" ON public.fee_structures FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access on staff_attendance" ON public.staff_attendance;
CREATE POLICY "Allow full access on staff_attendance" ON public.staff_attendance FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access on pickup_passes" ON public.pickup_passes;
CREATE POLICY "Allow full access on pickup_passes" ON public.pickup_passes FOR ALL TO public USING (true) WITH CHECK (true);

-- ==============================================================================
-- 6. REALTIME PUBLICATION
-- ==============================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.schools;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_attendance;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_passes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- 7. SEED ALL 33 CLASS TIERS INTO public.classes (with school_id)
-- Ensures foreign key constraints for student registration will never fail!
-- ==============================================================================
INSERT INTO public.classes (id, school_id, name, session, level, arm, stage, student_count)
VALUES
  -- Early Childhood
  ('cls-creche', '00000000-0000-0000-0000-000000000001'::UUID, 'Creche', '2025/2026', 'Creche', NULL, 'early_childhood', 0),
  ('cls-pre-nursery', '00000000-0000-0000-0000-000000000001'::UUID, 'Pre-Nursery', '2025/2026', 'Pre-Nursery', NULL, 'early_childhood', 0),
  ('cls-nursery-1', '00000000-0000-0000-0000-000000000001'::UUID, 'Nursery 1', '2025/2026', 'Nursery 1', NULL, 'early_childhood', 0),
  ('cls-nursery-2', '00000000-0000-0000-0000-000000000001'::UUID, 'Nursery 2', '2025/2026', 'Nursery 2', NULL, 'early_childhood', 0),
  ('cls-nursery-3', '00000000-0000-0000-0000-000000000001'::UUID, 'Nursery 3', '2025/2026', 'Nursery 3', NULL, 'early_childhood', 0),

  -- Lower & Upper Primary
  ('cls-pri-1', '00000000-0000-0000-0000-000000000001'::UUID, 'Primary 1', '2025/2026', 'Primary 1', NULL, 'primary_lower', 0),
  ('cls-pri-2', '00000000-0000-0000-0000-000000000001'::UUID, 'Primary 2', '2025/2026', 'Primary 2', NULL, 'primary_lower', 0),
  ('cls-pri-3', '00000000-0000-0000-0000-000000000001'::UUID, 'Primary 3', '2025/2026', 'Primary 3', NULL, 'primary_lower', 0),
  ('cls-pri-4', '00000000-0000-0000-0000-000000000001'::UUID, 'Primary 4', '2025/2026', 'Primary 4', NULL, 'primary_upper', 0),
  ('cls-pri-5', '00000000-0000-0000-0000-000000000001'::UUID, 'Primary 5', '2025/2026', 'Primary 5', NULL, 'primary_upper', 0),
  ('cls-pri-6', '00000000-0000-0000-0000-000000000001'::UUID, 'Primary 6', '2025/2026', 'Primary 6', NULL, 'primary_upper', 0),

  -- Junior Secondary
  ('cls-jss-1', '00000000-0000-0000-0000-000000000001'::UUID, 'JSS 1', '2025/2026', 'JSS 1', NULL, 'junior_secondary', 0),
  ('cls-jss-2', '00000000-0000-0000-0000-000000000001'::UUID, 'JSS 2', '2025/2026', 'JSS 2', NULL, 'junior_secondary', 0),
  ('cls-jss-3', '00000000-0000-0000-0000-000000000001'::UUID, 'JSS 3', '2025/2026', 'JSS 3', NULL, 'junior_secondary', 0),

  -- Senior Secondary: SS1
  ('cls-ss1-a', '00000000-0000-0000-0000-000000000001'::UUID, 'SS1 Arm A', '2025/2026', 'SS1', 'Arm A', 'senior_secondary', 0),
  ('cls-ss1-b', '00000000-0000-0000-0000-000000000001'::UUID, 'SS1 Arm B', '2025/2026', 'SS1', 'Arm B', 'senior_secondary', 0),
  ('cls-ss1-c', '00000000-0000-0000-0000-000000000001'::UUID, 'SS1 Arm C', '2025/2026', 'SS1', 'Arm C', 'senior_secondary', 0),
  ('cls-ss1-d', '00000000-0000-0000-0000-000000000001'::UUID, 'SS1 Arm D', '2025/2026', 'SS1', 'Arm D', 'senior_secondary', 0),
  ('cls-ss1-e', '00000000-0000-0000-0000-000000000001'::UUID, 'SS1 Arm E', '2025/2026', 'SS1', 'Arm E', 'senior_secondary', 0),
  ('cls-ss1-f', '00000000-0000-0000-0000-000000000001'::UUID, 'SS1 Arm F', '2025/2026', 'SS1', 'Arm F', 'senior_secondary', 0),

  -- Senior Secondary: SS2
  ('cls-ss2-a', '00000000-0000-0000-0000-000000000001'::UUID, 'SS2 Arm A', '2025/2026', 'SS2', 'Arm A', 'senior_secondary', 0),
  ('cls-ss2-b', '00000000-0000-0000-0000-000000000001'::UUID, 'SS2 Arm B', '2025/2026', 'SS2', 'Arm B', 'senior_secondary', 0),
  ('cls-ss2-c', '00000000-0000-0000-0000-000000000001'::UUID, 'SS2 Arm C', '2025/2026', 'SS2', 'Arm C', 'senior_secondary', 0),
  ('cls-ss2-d', '00000000-0000-0000-0000-000000000001'::UUID, 'SS2 Arm D', '2025/2026', 'SS2', 'Arm D', 'senior_secondary', 0),
  ('cls-ss2-e', '00000000-0000-0000-0000-000000000001'::UUID, 'SS2 Arm E', '2025/2026', 'SS2', 'Arm E', 'senior_secondary', 0),
  ('cls-ss2-f', '00000000-0000-0000-0000-000000000001'::UUID, 'SS2 Arm F', '2025/2026', 'SS2', 'Arm F', 'senior_secondary', 0),

  -- Senior Secondary: SS3
  ('cls-ss3-a', '00000000-0000-0000-0000-000000000001'::UUID, 'SS3 Arm A', '2025/2026', 'SS3', 'Arm A', 'senior_secondary', 0),
  ('cls-ss3-b', '00000000-0000-0000-0000-000000000001'::UUID, 'SS3 Arm B', '2025/2026', 'SS3', 'Arm B', 'senior_secondary', 0),
  ('cls-ss3-c', '00000000-0000-0000-0000-000000000001'::UUID, 'SS3 Arm C', '2025/2026', 'SS3', 'Arm C', 'senior_secondary', 0),
  ('cls-ss3-d', '00000000-0000-0000-0000-000000000001'::UUID, 'SS3 Arm D', '2025/2026', 'SS3', 'Arm D', 'senior_secondary', 0),
  ('cls-ss3-e', '00000000-0000-0000-0000-000000000001'::UUID, 'SS3 Arm E', '2025/2026', 'SS3', 'Arm E', 'senior_secondary', 0),
  ('cls-ss3-f', '00000000-0000-0000-0000-000000000001'::UUID, 'SS3 Arm F', '2025/2026', 'SS3', 'Arm F', 'senior_secondary', 0)
ON CONFLICT (id) DO UPDATE SET
  school_id = EXCLUDED.school_id,
  name = EXCLUDED.name,
  session = EXCLUDED.session,
  level = EXCLUDED.level,
  arm = EXCLUDED.arm,
  stage = EXCLUDED.stage;
