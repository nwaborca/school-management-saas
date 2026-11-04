-- =====================================================================
-- NIGERIAN SCHOOL SYSTEM DATABASE SCHEMA (CRECHE TO SS3)
-- Currency: Nigerian Naira (NGN / ₦)
-- Phone Prefix: Nigerian +234
-- Continuous Assessment (CA1 20, CA2 20, Exam 60 = 100)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLASSES TABLE (Creche to SS3 with Arms A to F)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,                  -- e.g. 'Creche', 'Primary 4', 'JSS 1', 'SS1 Arm A'
    session VARCHAR(20) NOT NULL DEFAULT '2025/2026',
    stage VARCHAR(50) NOT NULL,                  -- 'early_childhood', 'primary_lower', 'primary_upper', 'junior_secondary', 'senior_secondary'
    level VARCHAR(50) NOT NULL,                  -- 'Creche', 'Nursery 1', 'Primary 1', 'JSS 1', 'SS1', etc.
    arm VARCHAR(50),                             -- 'Arm A', 'Arm B', 'Arm C', 'Arm D', 'Arm E', 'Arm F'
    class_teacher_name VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, session)
);

CREATE INDEX IF NOT EXISTS idx_classes_stage ON public.classes(stage);

-- 2. MASTER SUBJECTS TABLE WITH LEVEL MAPPINGS
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) UNIQUE NOT NULL,          -- e.g. 'Basic Tech', 'Chemistry', 'Nigerian Language (Igbo/Hausa/Yoruba)'
    code VARCHAR(50) UNIQUE NOT NULL,           -- e.g. 'BTC-101', 'CHM-201'
    category VARCHAR(50) DEFAULT 'general',     -- 'core', 'science', 'arts', 'commercial', 'vocational', 'early_dev'
    applicable_stages JSONB NOT NULL DEFAULT '["senior_secondary"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STAFF & TEACHERS TABLE
CREATE TABLE IF NOT EXISTS public.staff_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher')),
    title VARCHAR(100),                          -- e.g. 'Principal', 'HOD Science & Technology'
    phone VARCHAR(50) DEFAULT '+2348033479547', -- Nigerian phone format
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TEACHER_SUBJECT_ALLOCATIONS
-- (teacher_id, subject_id, class_id)
CREATE TABLE IF NOT EXISTS public.teacher_subject_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.staff_users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, subject_id, class_id)
);

-- 5. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reg_number VARCHAR(50) UNIQUE NOT NULL,     -- e.g. 'STU-2026-089' (Access login)
    access_pin VARCHAR(255) NOT NULL,           -- 4-digit PIN (e.g. '2026')
    full_name VARCHAR(255) NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    session VARCHAR(20) DEFAULT '2025/2026',
    parent_name VARCHAR(255),
    parent_phone VARCHAR(50) DEFAULT '+2348033479547', -- Nigerian Phone +234
    gpa NUMERIC(3, 2) DEFAULT 0.00,
    fee_paid BOOLEAN DEFAULT FALSE,             -- Boolean column for Admin Fee toggle
    tuition_status VARCHAR(20) DEFAULT 'pending' CHECK (tuition_status IN ('paid', 'pending', 'partial', 'overdue')),
    is_active BOOLEAN DEFAULT TRUE,
    -- Dual Enrollment Audit Provenance Tracking
    enrolled_by_role VARCHAR(50) DEFAULT 'Bursar' CHECK (enrolled_by_role IN ('Bursar', 'Principal', 'Form Teacher')),
    enrolled_by_name VARCHAR(255) DEFAULT 'System Administrator',
    enrollment_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);

-- 6. RESULTS & GRADES TABLE (Nigerian CA1 20 + CA2 20 + Exam 60 = 100)
CREATE TABLE IF NOT EXISTS public.results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    term VARCHAR(50) NOT NULL,                  -- '1st Term', '2nd Term', '3rd Term'
    session VARCHAR(20) NOT NULL DEFAULT '2025/2026',
    ca1 NUMERIC(5, 2) DEFAULT 0.00 CHECK (ca1 >= 0 AND ca1 <= 20),     -- 1st Continuous Assessment (Max 20)
    ca2 NUMERIC(5, 2) DEFAULT 0.00 CHECK (ca2 >= 0 AND ca2 <= 20),     -- 2nd Continuous Assessment (Max 20)
    exam NUMERIC(5, 2) DEFAULT 0.00 CHECK (exam >= 0 AND exam <= 60),   -- Terminal Examination (Max 60)
    total_score NUMERIC(5, 2) GENERATED ALWAYS AS (ca1 + ca2 + exam) STORED, -- Total 100
    grade VARCHAR(5) NOT NULL,                  -- 'A', 'B', 'C', 'D', 'F'
    remarks TEXT,
    graded_by UUID REFERENCES public.staff_users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, subject_id, class_id, term, session)
);

-- 7. TUITION INVOICES IN NIGERIAN NAIRA (₦)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    term VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    currency VARCHAR(10) DEFAULT 'NGN',         -- Nigerian Naira (₦)
    total_amount NUMERIC(12, 2) NOT NULL,       -- e.g. 245000.00 (₦245,000)
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    fee_paid BOOLEAN DEFAULT FALSE,             -- Boolean column for Admin Fee toggle
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'partial', 'overdue')),
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- NIGERIAN CURRICULUM SEED DATA
-- =====================================================================

-- Classes: Creche to SS3
INSERT INTO public.classes (id, name, session, stage, level, arm, class_teacher_name)
VALUES
    -- Early Childhood
    ('c0000000-0000-0000-0001-000000000001', 'Creche', '2025/2026', 'early_childhood', 'Creche', 'Toddlers', 'Mrs. Bisi Adeleke'),
    ('c0000000-0000-0001-0001-000000000001', 'Nursery 1', '2025/2026', 'early_childhood', 'Nursery 1', 'Emerald', 'Mrs. Mary Okoro'),
    ('c0000000-0000-0002-0001-000000000001', 'Nursery 2', '2025/2026', 'early_childhood', 'Nursery 2', 'Ruby', 'Mrs. Folake Johnson'),
    ('c0000000-0000-0003-0001-000000000001', 'Nursery 3', '2025/2026', 'early_childhood', 'Nursery 3', 'Diamond', 'Mrs. Blessing Danjuma'),
    -- Primary
    ('c0000000-0000-0004-0001-000000000001', 'Primary 1', '2025/2026', 'primary_lower', 'Primary 1', 'Gold', 'Mr. Chidi Eze'),
    ('c0000000-0000-0005-0001-000000000001', 'Primary 4', '2025/2026', 'primary_upper', 'Primary 4', 'Silver', 'Mrs. Amina Bello'),
    ('c0000000-0000-0006-0001-000000000001', 'Primary 6', '2025/2026', 'primary_upper', 'Primary 6', 'Champions', 'Mr. Tayo Olatunji'),
    -- Junior Secondary (JSS 1 - 3)
    ('c0000000-0000-0007-0001-000000000001', 'JSS 1', '2025/2026', 'junior_secondary', 'JSS 1', 'Arm A', 'Mr. Samuel Usman'),
    ('c0000000-0000-0008-0001-000000000001', 'JSS 2', '2025/2026', 'junior_secondary', 'JSS 2', 'Arm A', 'Mrs. Ngozi Nwosu'),
    ('c0000000-0000-0009-0001-000000000001', 'JSS 3', '2025/2026', 'junior_secondary', 'JSS 3', 'Arm A', 'Mr. Ibrahim Musa'),
    -- Senior Secondary (SS1 - SS3 with Arms A to F)
    ('c0000000-0000-0010-0001-000000000001', 'SS1 Arm A', '2025/2026', 'senior_secondary', 'SS1', 'Arm A', 'Prof. Margaret Keller'),
    ('c0000000-0000-0010-0002-000000000001', 'SS1 Arm B', '2025/2026', 'senior_secondary', 'SS1', 'Arm B', 'Dr. David Thorne'),
    ('c0000000-0000-0011-0001-000000000001', 'SS2 Arm A', '2025/2026', 'senior_secondary', 'SS2', 'Arm A', 'Mrs. Hauwa Dikko'),
    ('c0000000-0000-0012-0001-000000000001', 'SS3 Arm A', '2025/2026', 'senior_secondary', 'SS3', 'Arm A', 'Dr. Arthur Vance')
ON CONFLICT (name, session) DO NOTHING;
