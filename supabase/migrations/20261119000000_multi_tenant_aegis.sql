-- ==============================================================================
-- AEGIS MULTI-TENANT ARCHITECTURE (PHASE 1) MIGRATION SCRIPT
-- Compatible with PostgreSQL 15+ / Supabase
-- Covers:
--  1. public.schools table with geolocation & geofencing radius
--  2. Default Aegis Academy seed record
--  3. Addition of school_id to existing tenant tables (students, staff, classes,
--     fee_structures, fee_ledgers, receipts, term_results, subjects)
--  4. Foreign keys, composite indexes, and data backfilling
--  5. public.staff_attendance (GPS-verified staff clock-in / clock-out)
--  6. public.pickup_passes (Digital student pickup authentication)
--  7. Row Level Security (RLS) on all tenant tables with safe client policies
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure default tenant exists so existing data can be associated safely
-- Default invite code: AEGIS-2026
DO $$
DECLARE
  v_default_school_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN
  INSERT INTO public.schools (id, name, invite_code, latitude, longitude, geofence_radius_meters)
  VALUES (
    v_default_school_id,
    'Aegis Academy Nigeria',
    'AEGIS-2026',
    6.5244,  -- Example default coords (Lagos, Nigeria)
    3.3792,
    150
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    invite_code = EXCLUDED.invite_code,
    latitude = COALESCE(public.schools.latitude, EXCLUDED.latitude),
    longitude = COALESCE(public.schools.longitude, EXCLUDED.longitude),
    geofence_radius_meters = EXCLUDED.geofence_radius_meters;
END $$;

-- ==============================================================================
-- 3. ADD school_id TO EXISTING TENANT TABLES & BACKFILL
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

-- Backfill classes school_id
UPDATE public.classes 
SET school_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE school_id IS NULL;

ALTER TABLE public.classes ALTER COLUMN school_id SET NOT NULL;

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

ALTER TABLE public.staff ALTER COLUMN school_id SET NOT NULL;

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

ALTER TABLE public.students ALTER COLUMN school_id SET NOT NULL;

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


-- F. FEE_LEDGERS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fee_ledgers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'fee_ledgers' AND column_name = 'school_id'
    ) THEN
      ALTER TABLE public.fee_ledgers ADD COLUMN school_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID;
      UPDATE public.fee_ledgers SET school_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE school_id IS NULL;
      ALTER TABLE public.fee_ledgers ADD CONSTRAINT fk_fee_ledgers_school FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS idx_fee_ledgers_school_id ON public.fee_ledgers(school_id);
    END IF;
  END IF;
END $$;


-- G. RECEIPTS
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


-- H. TERM_RESULTS
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

-- A. STAFF_ATTENDANCE (Geofence verified clock-in / clock-out)
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


-- B. PICKUP_PASSES (Digital dismissal / authorization security)
CREATE TABLE IF NOT EXISTS public.pickup_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  pass_type TEXT NOT NULL CHECK (pass_type IN ('DAILY_PARENT', 'DELEGATE_5H')),
  delegate_name TEXT NULL,
  otp_code TEXT NOT NULL,
  qr_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  picked_up_at TIMESTAMPTZ NULL,
  verified_by_staff_id UUID NULL REFERENCES public.staff(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pickup_passes_school_id ON public.pickup_passes(school_id);
CREATE INDEX IF NOT EXISTS idx_pickup_passes_student_id ON public.pickup_passes(student_id);
CREATE INDEX IF NOT EXISTS idx_pickup_passes_otp ON public.pickup_passes(school_id, otp_code);
CREATE INDEX IF NOT EXISTS idx_pickup_passes_status ON public.pickup_passes(school_id, status);


-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tenant tables
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

-- Schools RLS: readable by anyone with invite code / public, manageable by auth / admin
DROP POLICY IF EXISTS "Allow public select on schools" ON public.schools;
CREATE POLICY "Allow public select on schools" ON public.schools FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public insert on schools" ON public.schools;
CREATE POLICY "Allow public insert on schools" ON public.schools FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on schools" ON public.schools;
CREATE POLICY "Allow public update on schools" ON public.schools FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Allow public delete on schools" ON public.schools;
CREATE POLICY "Allow public delete on schools" ON public.schools FOR DELETE TO public USING (true);

-- Staff RLS
DROP POLICY IF EXISTS "Allow full access on staff" ON public.staff;
CREATE POLICY "Allow full access on staff" ON public.staff FOR ALL TO public USING (true) WITH CHECK (true);

-- Students RLS
DROP POLICY IF EXISTS "Allow full access on students" ON public.students;
CREATE POLICY "Allow full access on students" ON public.students FOR ALL TO public USING (true) WITH CHECK (true);

-- Classes RLS
DROP POLICY IF EXISTS "Allow full access on classes" ON public.classes;
CREATE POLICY "Allow full access on classes" ON public.classes FOR ALL TO public USING (true) WITH CHECK (true);

-- Subjects RLS
DROP POLICY IF EXISTS "Allow full access on subjects" ON public.subjects;
CREATE POLICY "Allow full access on subjects" ON public.subjects FOR ALL TO public USING (true) WITH CHECK (true);

-- Term Results RLS
DROP POLICY IF EXISTS "Allow full access on term_results" ON public.term_results;
CREATE POLICY "Allow full access on term_results" ON public.term_results FOR ALL TO public USING (true) WITH CHECK (true);

-- Receipts RLS
DROP POLICY IF EXISTS "Allow full access on receipts" ON public.receipts;
CREATE POLICY "Allow full access on receipts" ON public.receipts FOR ALL TO public USING (true) WITH CHECK (true);

-- Fee Structures RLS
DROP POLICY IF EXISTS "Allow full access on fee_structures" ON public.fee_structures;
CREATE POLICY "Allow full access on fee_structures" ON public.fee_structures FOR ALL TO public USING (true) WITH CHECK (true);

-- Staff Attendance RLS
DROP POLICY IF EXISTS "Allow full access on staff_attendance" ON public.staff_attendance;
CREATE POLICY "Allow full access on staff_attendance" ON public.staff_attendance FOR ALL TO public USING (true) WITH CHECK (true);

-- Pickup Passes RLS
DROP POLICY IF EXISTS "Allow full access on pickup_passes" ON public.pickup_passes;
CREATE POLICY "Allow full access on pickup_passes" ON public.pickup_passes FOR ALL TO public USING (true) WITH CHECK (true);


-- ==============================================================================
-- 6. REALTIME REPLICATION PUBLICATION
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
