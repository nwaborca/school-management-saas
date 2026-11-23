-- ==============================================================================
-- AEGIS SAAS ROW LEVEL SECURITY (RLS) LOCKDOWN
-- Phase 2: Restrict Direct Client (Anon/Public) Access & Enforce Service Role Exclusivity
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) across all core tenant tables
ALTER TABLE IF EXISTS public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.term_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pickup_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_dismissal_audits ENABLE ROW LEVEL SECURITY;

-- 2. Drop all legacy permissive policies allowing unauthenticated/public access
DROP POLICY IF EXISTS "Public can view schools" ON public.schools;
DROP POLICY IF EXISTS "Allow public read on schools" ON public.schools;
DROP POLICY IF EXISTS "Allow anon select schools" ON public.schools;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.schools;

DROP POLICY IF EXISTS "Allow public read on staff" ON public.staff;
DROP POLICY IF EXISTS "Allow public write on staff" ON public.staff;
DROP POLICY IF EXISTS "Public read on staff" ON public.staff;
DROP POLICY IF EXISTS "Allow anon all on staff" ON public.staff;

DROP POLICY IF EXISTS "Allow public read on students" ON public.students;
DROP POLICY IF EXISTS "Allow public write on students" ON public.students;
DROP POLICY IF EXISTS "Public read on students" ON public.students;
DROP POLICY IF EXISTS "Allow anon all on students" ON public.students;

DROP POLICY IF EXISTS "Allow public read on classes" ON public.classes;
DROP POLICY IF EXISTS "Allow public write on classes" ON public.classes;
DROP POLICY IF EXISTS "Allow anon all on classes" ON public.classes;

DROP POLICY IF EXISTS "Allow public read on term_results" ON public.term_results;
DROP POLICY IF EXISTS "Allow public write on term_results" ON public.term_results;
DROP POLICY IF EXISTS "Allow anon all on term_results" ON public.term_results;

DROP POLICY IF EXISTS "Allow public read on fee_structures" ON public.fee_structures;
DROP POLICY IF EXISTS "Allow public write on fee_structures" ON public.fee_structures;
DROP POLICY IF EXISTS "Allow anon all on fee_structures" ON public.fee_structures;

DROP POLICY IF EXISTS "Allow public read on receipts" ON public.receipts;
DROP POLICY IF EXISTS "Allow public write on receipts" ON public.receipts;
DROP POLICY IF EXISTS "Allow anon all on receipts" ON public.receipts;

DROP POLICY IF EXISTS "Allow public read on staff_attendance" ON public.staff_attendance;
DROP POLICY IF EXISTS "Allow public write on staff_attendance" ON public.staff_attendance;
DROP POLICY IF EXISTS "Allow anon all on staff_attendance" ON public.staff_attendance;

DROP POLICY IF EXISTS "Allow public read on pickup_passes" ON public.pickup_passes;
DROP POLICY IF EXISTS "Allow public write on pickup_passes" ON public.pickup_passes;
DROP POLICY IF EXISTS "Allow anon all on pickup_passes" ON public.pickup_passes;

DROP POLICY IF EXISTS "Allow public read on announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow public write on announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow anon all on announcements" ON public.announcements;

DROP POLICY IF EXISTS "Allow public read on class_dismissal_audits" ON public.class_dismissal_audits;
DROP POLICY IF EXISTS "Allow public write on class_dismissal_audits" ON public.class_dismissal_audits;
DROP POLICY IF EXISTS "Allow anon all on class_dismissal_audits" ON public.class_dismissal_audits;

-- 3. Enforce Strict Service Role Policies (All server route mutations via SUPABASE_SERVICE_ROLE_KEY)
-- Postgres service_role bypasses RLS by default, but explicit service_role policies ensure
-- strict adherence when invoked via Supabase PostgREST endpoints.

CREATE POLICY "Service role full access on schools"
  ON public.schools
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on staff"
  ON public.staff
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on students"
  ON public.students
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on classes"
  ON public.classes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on term_results"
  ON public.term_results
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on fee_structures"
  ON public.fee_structures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on receipts"
  ON public.receipts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on staff_attendance"
  ON public.staff_attendance
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on pickup_passes"
  ON public.pickup_passes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on announcements"
  ON public.announcements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on class_dismissal_audits"
  ON public.class_dismissal_audits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
