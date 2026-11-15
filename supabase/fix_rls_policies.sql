-- ==============================================================================
-- AEGIS SCHOOL MANAGEMENT SAAS - ANONYMOUS ACCESS POLICY UPDATE
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/omfmkvvyyazikdbcsotd/sql/new
-- ==============================================================================

-- 1. Enable RLS on all tables (if not already enabled)
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

-- 2. Allow public/anon access for Staff (Teachers, Admins)
DROP POLICY IF EXISTS "Allow anon select on staff" ON public.staff;
CREATE POLICY "Allow anon select on staff" ON public.staff FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert on staff" ON public.staff;
CREATE POLICY "Allow anon insert on staff" ON public.staff FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on staff" ON public.staff;
CREATE POLICY "Allow anon update on staff" ON public.staff FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon delete on staff" ON public.staff;
CREATE POLICY "Allow anon delete on staff" ON public.staff FOR DELETE TO anon USING (true);

-- 3. Allow public/anon access for Students
DROP POLICY IF EXISTS "Allow anon select on students" ON public.students;
CREATE POLICY "Allow anon select on students" ON public.students FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert on students" ON public.students;
CREATE POLICY "Allow anon insert on students" ON public.students FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on students" ON public.students;
CREATE POLICY "Allow anon update on students" ON public.students FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon delete on students" ON public.students;
CREATE POLICY "Allow anon delete on students" ON public.students FOR DELETE TO anon USING (true);

-- 4. Allow public/anon access for Classes
DROP POLICY IF EXISTS "Allow anon select on classes" ON public.classes;
CREATE POLICY "Allow anon select on classes" ON public.classes FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert on classes" ON public.classes;
CREATE POLICY "Allow anon insert on classes" ON public.classes FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on classes" ON public.classes;
CREATE POLICY "Allow anon update on classes" ON public.classes FOR UPDATE TO anon USING (true);

-- 5. Allow public/anon access for Term Results
DROP POLICY IF EXISTS "Allow anon select on term_results" ON public.term_results;
CREATE POLICY "Allow anon select on term_results" ON public.term_results FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert on term_results" ON public.term_results;
CREATE POLICY "Allow anon insert on term_results" ON public.term_results FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on term_results" ON public.term_results;
CREATE POLICY "Allow anon update on term_results" ON public.term_results FOR UPDATE TO anon USING (true);

-- 6. Allow public/anon access for Receipts
DROP POLICY IF EXISTS "Allow anon select on receipts" ON public.receipts;
CREATE POLICY "Allow anon select on receipts" ON public.receipts FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert on receipts" ON public.receipts;
CREATE POLICY "Allow anon insert on receipts" ON public.receipts FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on receipts" ON public.receipts;
CREATE POLICY "Allow anon update on receipts" ON public.receipts FOR UPDATE TO anon USING (true);

-- 7. Allow public/anon access for Fee Structures
DROP POLICY IF EXISTS "Allow anon select on fee_structures" ON public.fee_structures;
CREATE POLICY "Allow anon select on fee_structures" ON public.fee_structures FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert on fee_structures" ON public.fee_structures;
CREATE POLICY "Allow anon insert on fee_structures" ON public.fee_structures FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on fee_structures" ON public.fee_structures;
CREATE POLICY "Allow anon update on fee_structures" ON public.fee_structures FOR UPDATE TO anon USING (true);

-- 8. Enable Full Realtime publication for tables so cross-client sync works automatically
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.term_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_structures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
