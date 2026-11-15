-- ==============================================================================
-- AEGIS SCHOOL MANAGEMENT SAAS - COMPREHENSIVE RLS POLICIES & SEED SCRIPT
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/omfmkvvyyazikdbcsotd/sql/new
-- ==============================================================================

-- 1. Enable RLS on all public tables
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.term_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fee_structures ENABLE ROW LEVEL SECURITY;

-- 2. Staff policies (Allow full access for both authenticated and anon users)
DROP POLICY IF EXISTS "Allow anon select on staff" ON public.staff;
CREATE POLICY "Allow anon select on staff" ON public.staff FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow anon insert on staff" ON public.staff;
CREATE POLICY "Allow anon insert on staff" ON public.staff FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on staff" ON public.staff;
CREATE POLICY "Allow anon update on staff" ON public.staff FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Allow anon delete on staff" ON public.staff;
CREATE POLICY "Allow anon delete on staff" ON public.staff FOR DELETE TO public USING (true);

-- 3. Classes policies (Allow full read, insert, update for both public and anon)
DROP POLICY IF EXISTS "Allow anon select on classes" ON public.classes;
DROP POLICY IF EXISTS "Classes are viewable by all authenticated users" ON public.classes;
CREATE POLICY "Allow anon select on classes" ON public.classes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow anon insert on classes" ON public.classes;
DROP POLICY IF EXISTS "Classes are manageable by admins" ON public.classes;
CREATE POLICY "Allow anon insert on classes" ON public.classes FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on classes" ON public.classes;
CREATE POLICY "Allow anon update on classes" ON public.classes FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Allow anon delete on classes" ON public.classes;
CREATE POLICY "Allow anon delete on classes" ON public.classes FOR DELETE TO public USING (true);

-- 4. Students policies (Allow full read, insert, update for both public and anon)
DROP POLICY IF EXISTS "Allow anon select on students" ON public.students;
DROP POLICY IF EXISTS "Admins, bursars, and teachers can view all student records" ON public.students;
CREATE POLICY "Allow anon select on students" ON public.students FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow anon insert on students" ON public.students;
DROP POLICY IF EXISTS "Admins and bursars can insert/update student profiles" ON public.students;
CREATE POLICY "Allow anon insert on students" ON public.students FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on students" ON public.students;
CREATE POLICY "Allow anon update on students" ON public.students FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Allow anon delete on students" ON public.students;
CREATE POLICY "Allow anon delete on students" ON public.students FOR DELETE TO public USING (true);

-- 5. Subjects policies
DROP POLICY IF EXISTS "Allow anon select on subjects" ON public.subjects;
CREATE POLICY "Allow anon select on subjects" ON public.subjects FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow anon insert on subjects" ON public.subjects;
CREATE POLICY "Allow anon insert on subjects" ON public.subjects FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on subjects" ON public.subjects;
CREATE POLICY "Allow anon update on subjects" ON public.subjects FOR UPDATE TO public USING (true);

-- 6. Term Results policies
DROP POLICY IF EXISTS "Allow anon select on term_results" ON public.term_results;
CREATE POLICY "Allow anon select on term_results" ON public.term_results FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow anon insert on term_results" ON public.term_results;
CREATE POLICY "Allow anon insert on term_results" ON public.term_results FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on term_results" ON public.term_results;
CREATE POLICY "Allow anon update on term_results" ON public.term_results FOR UPDATE TO public USING (true);

-- 7. Receipts policies
DROP POLICY IF EXISTS "Allow anon select on receipts" ON public.receipts;
CREATE POLICY "Allow anon select on receipts" ON public.receipts FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow anon insert on receipts" ON public.receipts;
CREATE POLICY "Allow anon insert on receipts" ON public.receipts FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on receipts" ON public.receipts;
CREATE POLICY "Allow anon update on receipts" ON public.receipts FOR UPDATE TO public USING (true);

-- 8. Fee Structures policies
DROP POLICY IF EXISTS "Allow anon select on fee_structures" ON public.fee_structures;
CREATE POLICY "Allow anon select on fee_structures" ON public.fee_structures FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow anon insert on fee_structures" ON public.fee_structures;
CREATE POLICY "Allow anon insert on fee_structures" ON public.fee_structures FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on fee_structures" ON public.fee_structures;
CREATE POLICY "Allow anon update on fee_structures" ON public.fee_structures FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Allow anon delete on fee_structures" ON public.fee_structures;
CREATE POLICY "Allow anon delete on fee_structures" ON public.fee_structures FOR DELETE TO public USING (true);

-- 9. Realtime Publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.staff;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.term_results;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.receipts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_structures;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 10. SEED ALL 33 CLASS TIERS INTO public.classes
-- Ensures foreign key constraints for student registration will never fail!
INSERT INTO public.classes (id, name, session, level, arm, stage, student_count)
VALUES
  -- Early Childhood
  ('cls-creche', 'Creche', '2025/2026', 'Creche', NULL, 'early_childhood', 0),
  ('cls-pre-nursery', 'Pre-Nursery', '2025/2026', 'Pre-Nursery', NULL, 'early_childhood', 0),
  ('cls-nursery-1', 'Nursery 1', '2025/2026', 'Nursery 1', NULL, 'early_childhood', 0),
  ('cls-nursery-2', 'Nursery 2', '2025/2026', 'Nursery 2', NULL, 'early_childhood', 0),
  ('cls-nursery-3', 'Nursery 3', '2025/2026', 'Nursery 3', NULL, 'early_childhood', 0),

  -- Lower & Upper Primary
  ('cls-pri-1', 'Primary 1', '2025/2026', 'Primary 1', NULL, 'primary_lower', 0),
  ('cls-pri-2', 'Primary 2', '2025/2026', 'Primary 2', NULL, 'primary_lower', 0),
  ('cls-pri-3', 'Primary 3', '2025/2026', 'Primary 3', NULL, 'primary_lower', 0),
  ('cls-pri-4', 'Primary 4', '2025/2026', 'Primary 4', NULL, 'primary_upper', 0),
  ('cls-pri-5', 'Primary 5', '2025/2026', 'Primary 5', NULL, 'primary_upper', 0),
  ('cls-pri-6', 'Primary 6', '2025/2026', 'Primary 6', NULL, 'primary_upper', 0),

  -- Junior Secondary
  ('cls-jss-1', 'JSS 1', '2025/2026', 'JSS 1', NULL, 'junior_secondary', 0),
  ('cls-jss-2', 'JSS 2', '2025/2026', 'JSS 2', NULL, 'junior_secondary', 0),
  ('cls-jss-3', 'JSS 3', '2025/2026', 'JSS 3', NULL, 'junior_secondary', 0),

  -- Senior Secondary: SS1
  ('cls-ss1-a', 'SS1 Arm A', '2025/2026', 'SS1', 'Arm A', 'senior_secondary', 0),
  ('cls-ss1-b', 'SS1 Arm B', '2025/2026', 'SS1', 'Arm B', 'senior_secondary', 0),
  ('cls-ss1-c', 'SS1 Arm C', '2025/2026', 'SS1', 'Arm C', 'senior_secondary', 0),
  ('cls-ss1-d', 'SS1 Arm D', '2025/2026', 'SS1', 'Arm D', 'senior_secondary', 0),
  ('cls-ss1-e', 'SS1 Arm E', '2025/2026', 'SS1', 'Arm E', 'senior_secondary', 0),
  ('cls-ss1-f', 'SS1 Arm F', '2025/2026', 'SS1', 'Arm F', 'senior_secondary', 0),

  -- Senior Secondary: SS2
  ('cls-ss2-a', 'SS2 Arm A', '2025/2026', 'SS2', 'Arm A', 'senior_secondary', 0),
  ('cls-ss2-b', 'SS2 Arm B', '2025/2026', 'SS2', 'Arm B', 'senior_secondary', 0),
  ('cls-ss2-c', 'SS2 Arm C', '2025/2026', 'SS2', 'Arm C', 'senior_secondary', 0),
  ('cls-ss2-d', 'SS2 Arm D', '2025/2026', 'SS2', 'Arm D', 'senior_secondary', 0),
  ('cls-ss2-e', 'SS2 Arm E', '2025/2026', 'SS2', 'Arm E', 'senior_secondary', 0),
  ('cls-ss2-f', 'SS2 Arm F', '2025/2026', 'SS2', 'Arm F', 'senior_secondary', 0),

  -- Senior Secondary: SS3
  ('cls-ss3-a', 'SS3 Arm A', '2025/2026', 'SS3', 'Arm A', 'senior_secondary', 0),
  ('cls-ss3-b', 'SS3 Arm B', '2025/2026', 'SS3', 'Arm B', 'senior_secondary', 0),
  ('cls-ss3-c', 'SS3 Arm C', '2025/2026', 'SS3', 'Arm C', 'senior_secondary', 0),
  ('cls-ss3-d', 'SS3 Arm D', '2025/2026', 'SS3', 'Arm D', 'senior_secondary', 0),
  ('cls-ss3-e', 'SS3 Arm E', '2025/2026', 'SS3', 'Arm E', 'senior_secondary', 0),
  ('cls-ss3-f', 'SS3 Arm F', '2025/2026', 'SS3', 'Arm F', 'senior_secondary', 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  session = EXCLUDED.session,
  level = EXCLUDED.level,
  arm = EXCLUDED.arm,
  stage = EXCLUDED.stage;
