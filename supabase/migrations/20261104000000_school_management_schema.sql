-- ==============================================================================
-- NIGERIAN SCHOOL MANAGEMENT SAAS - SUPABASE SQL SCHEMA MIGRATION SCRIPT
-- Compatible with PostgreSQL 15+ / Supabase
-- Covers: classes, staff, students, fee_ledgers, receipts, term_results
-- Includes: Constraints, Defaults, Generated Columns, Triggers, RLS Policies, Indexes
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ENUM TYPES & DOMAINS
-- ==============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'educational_stage') THEN
    CREATE TYPE educational_stage AS ENUM (
      'early_childhood',   -- Creche, Pre-Nursery, Nursery 1 - 3
      'primary_lower',     -- Primary 1 - 3
      'primary_upper',     -- Primary 4 - 6
      'junior_secondary',  -- JSS 1 - 3
      'senior_secondary'   -- SS 1 - 3 (Arms A - F)
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
    CREATE TYPE staff_role AS ENUM ('admin', 'bursar', 'principal', 'teacher');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_status') THEN
    CREATE TYPE staff_status AS ENUM ('active', 'suspended', 'revoked');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'pending_verification', 'partially_paid', 'paid');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'receipt_status') THEN
    CREATE TYPE receipt_status AS ENUM ('pending_verification', 'approved', 'partially_approved', 'rejected');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'letter_grade') THEN
    CREATE TYPE letter_grade AS ENUM ('A', 'B', 'C', 'D', 'F');
  END IF;
END $$;

-- ==============================================================================
-- 3. CORE APPLICATION TABLES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. CLASSES (33 Class Tiers: Creche to SS3 Arm F)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
  id VARCHAR(64) PRIMARY KEY, -- e.g. 'cls-ss1-a', 'cls-jss1-a' or UUID
  name VARCHAR(100) NOT NULL, -- e.g. 'SS1 Arm A', 'Primary 4', 'Creche'
  session VARCHAR(20) NOT NULL DEFAULT '2025/2026', -- e.g. '2025/2026'
  level VARCHAR(50) NOT NULL, -- e.g. 'SS1', 'JSS 1', 'Primary 4'
  arm VARCHAR(20) DEFAULT NULL, -- e.g. 'Arm A', 'Arm B', 'Gold'
  stage educational_stage NOT NULL,
  class_teacher_id UUID DEFAULT NULL, -- references staff.id below
  student_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ------------------------------------------------------------------------------
-- B. STAFF / TEACHERS & ADMINISTRATORS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL, -- Supabase Auth link
  staff_id_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'TCH/2026/001' or 'ADM/2026/01'
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(25) NOT NULL, -- Format: +234XXXXXXXXXX
  email VARCHAR(150) UNIQUE NOT NULL,
  username VARCHAR(60) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role staff_role NOT NULL DEFAULT 'teacher',
  form_class_id VARCHAR(64) REFERENCES public.classes(id) ON DELETE SET NULL,
  assigned_subject_ids TEXT[] DEFAULT '{}',
  status staff_status NOT NULL DEFAULT 'active',
  session_token VARCHAR(255) DEFAULT gen_random_uuid()::text,
  last_credential_reset TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Circular FK link from classes to staff (form teacher)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_classes_class_teacher'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT fk_classes_class_teacher
      FOREIGN KEY (class_teacher_id) REFERENCES public.staff(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- C. STUDENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL, -- Supabase Auth link (optional)
  reg_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'STU-2026-089'
  access_pin VARCHAR(20) NOT NULL DEFAULT '2026', -- Portal login PIN
  full_name VARCHAR(150) NOT NULL,
  class_id VARCHAR(64) NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  class_grade VARCHAR(100) NOT NULL, -- e.g. 'SS1 Arm A'
  session VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  date_of_birth DATE DEFAULT NULL,
  parent_name VARCHAR(150) NOT NULL,
  parent_phone VARCHAR(25) NOT NULL, -- e.g. '+2348031234567'
  gpa NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
  attendance_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  fee_paid BOOLEAN NOT NULL DEFAULT FALSE, -- Fast index gate for result unlocking
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  
  -- Audit provenance tracking
  enrolled_by_role VARCHAR(50) DEFAULT 'Bursar',
  enrolled_by_name VARCHAR(150) DEFAULT 'Administrative Staff',
  enrollment_date TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  
  -- NDPA 2023 Compliance & Minor Data Protection Shield
  ndpa_consent_granted BOOLEAN NOT NULL DEFAULT TRUE,
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ------------------------------------------------------------------------------
-- D. FEE STRUCTURES & LEDGERS
-- ------------------------------------------------------------------------------
-- Itemized tuition fee structures per class arm per term
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id VARCHAR(64) NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  class_name VARCHAR(100) NOT NULL,
  term VARCHAR(20) NOT NULL, -- '1st Term', '2nd Term', '3rd Term'
  session VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { description: string, amount: number }
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  created_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT uq_fee_structure_class_term_session UNIQUE (class_id, term, session)
);

-- Student Fee Balance & Debt Ledgers
CREATE TABLE IF NOT EXISTS public.fee_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  term VARCHAR(20) NOT NULL,
  session VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  total_term_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  remaining_debt NUMERIC(12, 2) GENERATED ALWAYS AS (GREATEST(0.00, total_term_fee - amount_paid)) STORED,
  is_cleared BOOLEAN GENERATED ALWAYS AS (amount_paid >= total_term_fee AND total_term_fee > 0) STORED,
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  last_payment_date TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT uq_fee_ledger_student_term_session UNIQUE (student_id, term, session)
);

-- ------------------------------------------------------------------------------
-- E. RECEIPTS (Payment Proof Uploads & Audit Queue)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  term VARCHAR(20) NOT NULL DEFAULT '1st Term',
  session VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  amount_claimed NUMERIC(12, 2) NOT NULL,
  amount_approved NUMERIC(12, 2) DEFAULT NULL,
  payment_mode VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (payment_mode IN ('full', 'partial')),
  file_name VARCHAR(255) NOT NULL,
  file_data_url TEXT DEFAULT NULL, -- Base64 fallback if storage not configured
  storage_path TEXT DEFAULT NULL,   -- Supabase Storage bucket path: 'receipts/<student_id>/...'
  file_type VARCHAR(100) DEFAULT 'image/jpeg',
  status receipt_status NOT NULL DEFAULT 'pending_verification',
  reviewed_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NULL,
  admin_note TEXT DEFAULT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ------------------------------------------------------------------------------
-- F. SUBJECTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id VARCHAR(64) PRIMARY KEY, -- e.g. 'sub-eng', 'sub-mth', 'sub-che'
  name VARCHAR(150) NOT NULL,
  code VARCHAR(30) UNIQUE NOT NULL,
  stages educational_stage[] NOT NULL DEFAULT '{senior_secondary}',
  category VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ------------------------------------------------------------------------------
-- G. TERM RESULTS / CONTINUOUS ASSESSMENT & EXAMINATION MATRIX
-- ------------------------------------------------------------------------------
-- Standard: CA 1 (20) + CA 2 (20) + Terminal Exam (60) = Total (100)
CREATE TABLE IF NOT EXISTS public.term_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  subject_id VARCHAR(64) NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  term VARCHAR(20) NOT NULL, -- e.g. '1st Term'
  session VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  ca1 NUMERIC(4, 1) NOT NULL DEFAULT 0.0 CHECK (ca1 >= 0.0 AND ca1 <= 20.0),
  ca2 NUMERIC(4, 1) NOT NULL DEFAULT 0.0 CHECK (ca2 >= 0.0 AND ca2 <= 20.0),
  exam NUMERIC(4, 1) NOT NULL DEFAULT 0.0 CHECK (exam >= 0.0 AND exam <= 60.0),
  total_score NUMERIC(5, 1) GENERATED ALWAYS AS (ca1 + ca2 + exam) STORED,
  grade letter_grade NOT NULL DEFAULT 'F',
  remarks VARCHAR(100) DEFAULT NULL,
  audited_by VARCHAR(150) DEFAULT 'Faculty Staff',
  graded_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  audit_timestamp TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  graded_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT uq_term_result_student_subject_term_session UNIQUE (student_id, subject_id, term, session)
);

-- ==============================================================================
-- 4. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Trigger 1: Auto-update updated_at timestamp on record modification
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_classes_updated_at ON public.classes;
CREATE TRIGGER trg_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_staff_updated_at ON public.staff;
CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_fee_ledgers_updated_at ON public.fee_ledgers;
CREATE TRIGGER trg_fee_ledgers_updated_at BEFORE UPDATE ON public.fee_ledgers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_receipts_updated_at ON public.receipts;
CREATE TRIGGER trg_receipts_updated_at BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_term_results_updated_at ON public.term_results;
CREATE TRIGGER trg_term_results_updated_at BEFORE UPDATE ON public.term_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- Trigger 2: Auto-compute Nigerian WAEC/NECO Grade and Remark
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_result_grade_calculation()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  v_total := NEW.ca1 + NEW.ca2 + NEW.exam;
  
  IF v_total >= 75.0 THEN
    NEW.grade := 'A';
    NEW.remarks := 'Excellent (A1)';
  ELSIF v_total >= 65.0 THEN
    NEW.grade := 'B';
    NEW.remarks := 'Very Good (B2/B3)';
  ELSIF v_total >= 50.0 THEN
    NEW.grade := 'C';
    NEW.remarks := 'Credit (C4-C6)';
  ELSIF v_total >= 40.0 THEN
    NEW.grade := 'D';
    NEW.remarks := 'Pass (P7/P8)';
  ELSE
    NEW.grade := 'F';
    NEW.remarks := 'Fail (F9)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_term_results_grade_calc ON public.term_results;
CREATE TRIGGER trg_term_results_grade_calc
  BEFORE INSERT OR UPDATE OF ca1, ca2, exam ON public.term_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_result_grade_calculation();

-- ------------------------------------------------------------------------------
-- Trigger 3: Sync Student fee_paid boolean whenever fee_ledgers change
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_sync_student_fee_status()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id UUID;
  v_has_outstanding BOOLEAN;
BEGIN
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);

  -- Check if student has any unpaid or partially paid ledgers
  SELECT EXISTS (
    SELECT 1 FROM public.fee_ledgers
    WHERE student_id = v_student_id AND (amount_paid < total_term_fee OR total_term_fee = 0)
  ) INTO v_has_outstanding;

  UPDATE public.students
  SET 
    fee_paid = NOT v_has_outstanding,
    payment_status = CASE 
      WHEN NOT v_has_outstanding THEN 'paid'::payment_status
      ELSE (
        SELECT payment_status FROM public.fee_ledgers 
        WHERE student_id = v_student_id 
        ORDER BY updated_at DESC LIMIT 1
      )
    END
  WHERE id = v_student_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_student_fee_status ON public.fee_ledgers;
CREATE TRIGGER trg_sync_student_fee_status
  AFTER INSERT OR UPDATE OR DELETE ON public.fee_ledgers
  FOR EACH ROW EXECUTE FUNCTION public.handle_sync_student_fee_status();

-- ==============================================================================
-- 5. PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_reg_number ON public.students(reg_number);
CREATE INDEX IF NOT EXISTS idx_students_fee_paid ON public.students(fee_paid);
CREATE INDEX IF NOT EXISTS idx_staff_username ON public.staff(username);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff(role);
CREATE INDEX IF NOT EXISTS idx_fee_ledgers_student_term ON public.fee_ledgers(student_id, term, session);
CREATE INDEX IF NOT EXISTS idx_receipts_student_status ON public.receipts(student_id, status);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON public.receipts(status);
CREATE INDEX IF NOT EXISTS idx_term_results_student ON public.term_results(student_id);
CREATE INDEX IF NOT EXISTS idx_term_results_class_subject ON public.term_results(class_id, subject_id, term, session);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_results ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS staff_role AS $$
  SELECT role FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_bursar()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE auth_user_id = auth.uid() AND role IN ('admin', 'bursar', 'principal')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- RLS: CLASSES & SUBJECTS (Public readable, Admin modifiable)
-- ------------------------------------------------------------------------------
CREATE POLICY "Classes are viewable by all authenticated users"
  ON public.classes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Classes are manageable by admins"
  ON public.classes FOR ALL TO authenticated USING (public.is_admin_or_bursar());

CREATE POLICY "Subjects are viewable by all authenticated users"
  ON public.subjects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Subjects are manageable by admins"
  ON public.subjects FOR ALL TO authenticated USING (public.is_admin_or_bursar());

-- ------------------------------------------------------------------------------
-- RLS: STAFF
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff can view all faculty member profiles"
  ON public.staff FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins have full control over staff records"
  ON public.staff FOR ALL TO authenticated USING (public.is_admin_or_bursar());

CREATE POLICY "Staff members can update their own profile and session"
  ON public.staff FOR UPDATE TO authenticated USING (auth_user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- RLS: STUDENTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins, bursars, and teachers can view all student records"
  ON public.students FOR SELECT TO authenticated
  USING (
    public.is_admin_or_bursar() OR 
    EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid()) OR
    auth_user_id = auth.uid()
  );

CREATE POLICY "Admins and bursars can insert/update student profiles"
  ON public.students FOR ALL TO authenticated
  USING (public.is_admin_or_bursar());

-- ------------------------------------------------------------------------------
-- RLS: FEE STRUCTURES & LEDGERS
-- ------------------------------------------------------------------------------
CREATE POLICY "Fee structures are viewable by all authenticated users"
  ON public.fee_structures FOR SELECT TO authenticated USING (published = true OR public.is_admin_or_bursar());

CREATE POLICY "Fee structures are managed by admins and bursars"
  ON public.fee_structures FOR ALL TO authenticated USING (public.is_admin_or_bursar());

CREATE POLICY "Students can view their own fee ledgers"
  ON public.fee_ledgers FOR SELECT TO authenticated
  USING (
    public.is_admin_or_bursar() OR
    student_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admins and bursars can manage fee ledgers"
  ON public.fee_ledgers FOR ALL TO authenticated USING (public.is_admin_or_bursar());

-- ------------------------------------------------------------------------------
-- RLS: RECEIPTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Students can view and submit their own receipts"
  ON public.receipts FOR SELECT TO authenticated
  USING (
    public.is_admin_or_bursar() OR
    student_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Students can upload their payment receipts"
  ON public.receipts FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid()) OR
    public.is_admin_or_bursar()
  );

CREATE POLICY "Admins and bursars can audit and update receipts"
  ON public.receipts FOR UPDATE TO authenticated
  USING (public.is_admin_or_bursar());

-- ------------------------------------------------------------------------------
-- RLS: TERM RESULTS
-- ------------------------------------------------------------------------------
-- Strict clearance gate: Students can ONLY view term results if fee is paid!
CREATE POLICY "Students can view results only when fee clearance is satisfied"
  ON public.term_results FOR SELECT TO authenticated
  USING (
    public.is_admin_or_bursar() OR
    EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid()) OR
    (
      student_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid()) AND
      EXISTS (
        SELECT 1 FROM public.students s 
        WHERE s.id = term_results.student_id AND s.fee_paid = true
      )
    )
  );

CREATE POLICY "Teachers, Principal, and Admins can record and update term marks"
  ON public.term_results FOR ALL TO authenticated
  USING (
    public.is_admin_or_bursar() OR
    EXISTS (
      SELECT 1 FROM public.staff st
      WHERE st.auth_user_id = auth.uid() AND (
        st.form_class_id = term_results.class_id OR 
        term_results.subject_id = ANY(st.assigned_subject_ids)
      )
    )
  );

-- ==============================================================================
-- 7. SUPABASE STORAGE BUCKET CONFIGURATION
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Allow authenticated uploads into 'receipts'
CREATE POLICY "Authenticated users can upload receipt proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Admins, bursars, and receipt owners can view uploaded receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts');
