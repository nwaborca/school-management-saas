import {
  AcademicClass,
  AcademicSubject,
  TeacherSubjectAllocation,
  TeacherProfile,
  StudentResult,
  StudentProfile,
  TuitionInvoice,
  SchoolAnnouncement,
  FeeStructure,
  FeeLineItem,
  PaymentReceipt,
  PaymentTransaction,
  ReceiptStatus,
  calculateGradeAndRemark,
} from '@/types';

export const SCHOOL_INFO = {
  name: 'Apex Academy Nigeria',
  motto: 'Excellence, Character, and Innovation',
  session: '2025/2026',
  academic_year: '2025/2026',
  term: '1st Term',
  address: 'Plot 12, Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
  contact_phone: '+2348033479547',
  contact_email: 'admissions@apexacademy.sch.ng',
  principal_name: 'Dr. Arthur Vance',
  currency_code: 'NGN',
  currency_symbol: '₦',
};

// 1. Nigerian Class Hierarchy Structure (Creche to SS3 with Arms A to F)
export const INITIAL_CLASSES: AcademicClass[] = [
  // Early Childhood
  { id: 'cls-creche', name: 'Creche', session: '2025/2026', level: 'Creche', stage: 'early_childhood', class_teacher: 'Mrs. Bisi Adeleke', student_count: 8 },
  { id: 'cls-pre-nursery', name: 'Pre-Nursery', session: '2025/2026', level: 'Pre-Nursery', stage: 'early_childhood', class_teacher: 'Mrs. Kemi Ojo', student_count: 10 },
  { id: 'cls-nursery-1', name: 'Nursery 1', session: '2025/2026', level: 'Nursery 1', stage: 'early_childhood', class_teacher: 'Mrs. Mary Okoro', student_count: 12 },
  { id: 'cls-nursery-2', name: 'Nursery 2', session: '2025/2026', level: 'Nursery 2', stage: 'early_childhood', class_teacher: 'Mrs. Folake Johnson', student_count: 14 },
  { id: 'cls-nursery-3', name: 'Nursery 3', session: '2025/2026', level: 'Nursery 3', stage: 'early_childhood', class_teacher: 'Mrs. Blessing Danjuma', student_count: 15 },

  // Primary (Primary 1 to Primary 6)
  { id: 'cls-pri-1', name: 'Primary 1', session: '2025/2026', level: 'Primary 1', stage: 'primary_lower', class_teacher: 'Mr. Chidi Eze', student_count: 18 },
  { id: 'cls-pri-2', name: 'Primary 2', session: '2025/2026', level: 'Primary 2', stage: 'primary_lower', class_teacher: 'Mrs. Ngozi Madu', student_count: 20 },
  { id: 'cls-pri-3', name: 'Primary 3', session: '2025/2026', level: 'Primary 3', stage: 'primary_lower', class_teacher: 'Mr. Segun Adele', student_count: 19 },
  { id: 'cls-pri-4', name: 'Primary 4', session: '2025/2026', level: 'Primary 4', stage: 'primary_upper', class_teacher: 'Mrs. Amina Bello', student_count: 22 },
  { id: 'cls-pri-5', name: 'Primary 5', session: '2025/2026', level: 'Primary 5', stage: 'primary_upper', class_teacher: 'Mr. Yakubu Garba', student_count: 21 },
  { id: 'cls-pri-6', name: 'Primary 6', session: '2025/2026', level: 'Primary 6', stage: 'primary_upper', class_teacher: 'Mr. Tayo Olatunji', student_count: 24 },

  // Junior Secondary (JSS 1 to JSS 3)
  { id: 'cls-jss-1', name: 'JSS 1', session: '2025/2026', level: 'JSS 1', stage: 'junior_secondary', class_teacher: 'Mr. Samuel Usman', student_count: 25 },
  { id: 'cls-jss-2', name: 'JSS 2', session: '2025/2026', level: 'JSS 2', stage: 'junior_secondary', class_teacher: 'Mrs. Ngozi Nwosu', student_count: 23 },
  { id: 'cls-jss-3', name: 'JSS 3', session: '2025/2026', level: 'JSS 3', stage: 'junior_secondary', class_teacher: 'Mr. Ibrahim Musa', student_count: 26 },

  // Senior Secondary: SS1 (Arms A, B, C, D, E, F)
  { id: 'cls-ss1-a', name: 'SS1 Arm A', session: '2025/2026', level: 'SS1', arm: 'Arm A', stage: 'senior_secondary', class_teacher: 'Prof. Margaret Keller', student_count: 4 },
  { id: 'cls-ss1-b', name: 'SS1 Arm B', session: '2025/2026', level: 'SS1', arm: 'Arm B', stage: 'senior_secondary', class_teacher: 'Dr. David Thorne', student_count: 0 },
  { id: 'cls-ss1-c', name: 'SS1 Arm C', session: '2025/2026', level: 'SS1', arm: 'Arm C', stage: 'senior_secondary', class_teacher: 'Mrs. Hauwa Dikko', student_count: 0 },
  { id: 'cls-ss1-d', name: 'SS1 Arm D', session: '2025/2026', level: 'SS1', arm: 'Arm D', stage: 'senior_secondary', class_teacher: 'Mr. Femi Alabi', student_count: 0 },
  { id: 'cls-ss1-e', name: 'SS1 Arm E', session: '2025/2026', level: 'SS1', arm: 'Arm E', stage: 'senior_secondary', class_teacher: 'Mrs. Zainab Umar', student_count: 0 },
  { id: 'cls-ss1-f', name: 'SS1 Arm F', session: '2025/2026', level: 'SS1', arm: 'Arm F', stage: 'senior_secondary', class_teacher: 'Mr. Emeka Balogun', student_count: 0 },

  // Senior Secondary: SS2 (Arms A, B, C, D, E, F)
  { id: 'cls-ss2-a', name: 'SS2 Arm A', session: '2025/2026', level: 'SS2', arm: 'Arm A', stage: 'senior_secondary', class_teacher: 'Dr. David Thorne', student_count: 0 },
  { id: 'cls-ss2-b', name: 'SS2 Arm B', session: '2025/2026', level: 'SS2', arm: 'Arm B', stage: 'senior_secondary', class_teacher: 'Mrs. Hauwa Dikko', student_count: 0 },
  { id: 'cls-ss2-c', name: 'SS2 Arm C', session: '2025/2026', level: 'SS2', arm: 'Arm C', stage: 'senior_secondary', class_teacher: 'Mr. Femi Alabi', student_count: 0 },
  { id: 'cls-ss2-d', name: 'SS2 Arm D', session: '2025/2026', level: 'SS2', arm: 'Arm D', stage: 'senior_secondary', class_teacher: 'Mrs. Zainab Umar', student_count: 0 },
  { id: 'cls-ss2-e', name: 'SS2 Arm E', session: '2025/2026', level: 'SS2', arm: 'Arm E', stage: 'senior_secondary', class_teacher: 'Mr. Emeka Balogun', student_count: 0 },
  { id: 'cls-ss2-f', name: 'SS2 Arm F', session: '2025/2026', level: 'SS2', arm: 'Arm F', stage: 'senior_secondary', class_teacher: 'Mrs. Amanda Clark', student_count: 0 },

  // Senior Secondary: SS3 (Arms A, B, C, D, E, F)
  { id: 'cls-ss3-a', name: 'SS3 Arm A', session: '2025/2026', level: 'SS3', arm: 'Arm A', stage: 'senior_secondary', class_teacher: 'Dr. Arthur Vance', student_count: 0 },
  { id: 'cls-ss3-b', name: 'SS3 Arm B', session: '2025/2026', level: 'SS3', arm: 'Arm B', stage: 'senior_secondary', class_teacher: 'Mrs. Amanda Clark', student_count: 0 },
  { id: 'cls-ss3-c', name: 'SS3 Arm C', session: '2025/2026', level: 'SS3', arm: 'Arm C', stage: 'senior_secondary', class_teacher: 'Mr. Tayo Olatunji', student_count: 0 },
  { id: 'cls-ss3-d', name: 'SS3 Arm D', session: '2025/2026', level: 'SS3', arm: 'Arm D', stage: 'senior_secondary', class_teacher: 'Mrs. Bisi Adeleke', student_count: 0 },
  { id: 'cls-ss3-e', name: 'SS3 Arm E', session: '2025/2026', level: 'SS3', arm: 'Arm E', stage: 'senior_secondary', class_teacher: 'Mr. Chidi Eze', student_count: 0 },
  { id: 'cls-ss3-f', name: 'SS3 Arm F', session: '2025/2026', level: 'SS3', arm: 'Arm F', stage: 'senior_secondary', class_teacher: 'Prof. Margaret Keller', student_count: 0 },
];

// 2. Master Subjects Table Mapped Dynamically to Nigerian Educational Stages
export const INITIAL_SUBJECTS: AcademicSubject[] = [
  // --- Early Childhood (Creche – Nursery 3) ---
  { id: 'subj-ec-lang', name: 'Language & Literacy', code: 'EY-LIT', stages: ['early_childhood'], category: 'early_dev' },
  { id: 'subj-ec-num', name: 'Numeracy', code: 'EY-NUM', stages: ['early_childhood'], category: 'early_dev' },
  { id: 'subj-ec-rhymes', name: 'Rhymes & Songs', code: 'EY-RHY', stages: ['early_childhood'], category: 'early_dev' },
  { id: 'subj-ec-social', name: 'Social Habits', code: 'EY-SOC', stages: ['early_childhood'], category: 'early_dev' },
  { id: 'subj-ec-health', name: 'Health Habits', code: 'EY-HLT', stages: ['early_childhood'], category: 'early_dev' },
  { id: 'subj-ec-env', name: 'Environmental Awareness', code: 'EY-ENV', stages: ['early_childhood'], category: 'early_dev' },
  { id: 'subj-ec-art', name: 'Creative Arts', code: 'EY-ART', stages: ['early_childhood'], category: 'early_dev' },
  { id: 'subj-ec-pe', name: 'Physical Activities', code: 'EY-PHE', stages: ['early_childhood'], category: 'early_dev' },
  { id: 'subj-ec-rel', name: 'Religious Education', code: 'EY-REL', stages: ['early_childhood'], category: 'early_dev' },
  { id: 'subj-ec-sci', name: 'Basic Science (Early Years)', code: 'EY-SCI', stages: ['early_childhood'], category: 'early_dev' },

  // --- Primary 1 - 3 (Lower Primary) ---
  { id: 'subj-p-eng', name: 'English Studies', code: 'PRI-ENG', stages: ['primary_lower', 'primary_upper'], category: 'core' },
  { id: 'subj-p-math', name: 'Mathematics', code: 'PRI-MTH', stages: ['primary_lower', 'primary_upper'], category: 'core' },
  { id: 'subj-p-lang-ng', name: 'Nigerian Language (Igbo/Hausa/Yoruba)', code: 'PRI-NGL', stages: ['primary_lower', 'primary_upper', 'junior_secondary'], category: 'core' },
  { id: 'subj-p-bsci', name: 'Basic Science', code: 'PRI-BSC', stages: ['primary_lower', 'primary_upper', 'junior_secondary'], category: 'science' },
  { id: 'subj-p-phe', name: 'Physical and Health Education (PHE)', code: 'PRI-PHE', stages: ['primary_lower', 'primary_upper', 'junior_secondary'], category: 'general' },
  { id: 'subj-p-hist', name: 'Nigerian History', code: 'PRI-HIS', stages: ['primary_lower', 'primary_upper', 'junior_secondary', 'senior_secondary'], category: 'arts' },
  { id: 'subj-p-social', name: 'Social and Citizenship Studies', code: 'PRI-SCS', stages: ['primary_lower', 'primary_upper'], category: 'core' },
  { id: 'subj-p-cca', name: 'Cultural and Creative Arts (CCA)', code: 'PRI-CCA', stages: ['primary_lower', 'primary_upper', 'junior_secondary'], category: 'arts' },
  { id: 'subj-p-crs', name: 'Christian Religious Studies (CRS) / Islamic Studies (IS)', code: 'PRI-REL', stages: ['primary_lower', 'primary_upper', 'junior_secondary', 'senior_secondary'], category: 'arts' },

  // --- Primary 4 - 6 (Upper Primary) Specifics ---
  { id: 'subj-btech', name: 'Basic Technology', code: 'JSS-BTE', stages: ['primary_upper', 'junior_secondary'], category: 'science' },
  { id: 'subj-dig-lit', name: 'Basic Digital Literacy', code: 'PRI-BDL', stages: ['primary_upper'], category: 'science' },
  { id: 'subj-prevoc', name: 'Pre-vocational Studies', code: 'PRI-PVS', stages: ['primary_upper'], category: 'vocational' },
  { id: 'subj-french', name: 'French Language', code: 'SEC-FRE', stages: ['primary_upper', 'junior_secondary'], category: 'arts' },

  // --- Junior Secondary 1 - 3 Specifics ---
  { id: 'subj-j-eng', name: 'English Language', code: 'JSS-ENG', stages: ['junior_secondary', 'senior_secondary'], category: 'core' },
  { id: 'subj-j-math', name: 'General Mathematics', code: 'JSS-MTH', stages: ['junior_secondary', 'senior_secondary'], category: 'core' },
  { id: 'subj-j-digtech', name: 'Digital Technologies', code: 'JSS-DIT', stages: ['junior_secondary', 'senior_secondary'], category: 'core' },
  { id: 'subj-j-bus', name: 'Business Studies', code: 'JSS-BUS', stages: ['junior_secondary'], category: 'commercial' },
  { id: 'subj-j-soc', name: 'Social Studies', code: 'JSS-SOC', stages: ['junior_secondary'], category: 'core' },
  { id: 'subj-j-civic', name: 'Civic Education / Citizenship Studies', code: 'SEC-CIV', stages: ['junior_secondary', 'senior_secondary'], category: 'core' },
  { id: 'subj-j-agric', name: 'Agricultural Science', code: 'SEC-AGR', stages: ['junior_secondary', 'senior_secondary'], category: 'science' },
  { id: 'subj-j-entrep', name: 'Entrepreneurship & Trade Subject', code: 'SEC-ENT', stages: ['junior_secondary', 'senior_secondary'], category: 'vocational' },

  // --- Senior Secondary 1 - 3 Electives ---
  // Science Electives
  { id: 'subj-s-phys', name: 'Physics', code: 'SSS-PHY', stages: ['senior_secondary'], category: 'science' },
  { id: 'subj-s-chem', name: 'Chemistry', code: 'SSS-CHM', stages: ['senior_secondary'], category: 'science' },
  { id: 'subj-s-bio', name: 'Biology', code: 'SSS-BIO', stages: ['senior_secondary'], category: 'science' },
  { id: 'subj-s-fmath', name: 'Further Mathematics', code: 'SSS-FMT', stages: ['senior_secondary'], category: 'science' },

  // Arts & Humanities Electives
  { id: 'subj-s-govt', name: 'Government', code: 'SSS-GOV', stages: ['senior_secondary'], category: 'arts' },
  { id: 'subj-s-lit', name: 'Literature-in-English', code: 'SSS-LIT', stages: ['senior_secondary'], category: 'arts' },

  // Commercial Electives
  { id: 'subj-s-acct', name: 'Financial Accounting', code: 'SSS-ACC', stages: ['senior_secondary'], category: 'commercial' },
  { id: 'subj-s-comm', name: 'Commerce', code: 'SSS-COM', stages: ['senior_secondary'], category: 'commercial' },
  { id: 'subj-s-econ', name: 'Economics', code: 'SSS-ECO', stages: ['senior_secondary'], category: 'commercial' },
  { id: 'subj-s-mkt', name: 'Marketing', code: 'SSS-MKT', stages: ['senior_secondary'], category: 'commercial' },
];

// 3. Teacher_Subject_Allocations
export const INITIAL_ALLOCATIONS: TeacherSubjectAllocation[] = [
  // Prof. Margaret Keller teaches Chemistry and Basic Tech in SS1 Arm A
  { id: 'alloc-1', teacher_id: 't-keller', teacher_name: 'Prof. Margaret Keller', subject_id: 'subj-s-chem', subject_name: 'Chemistry', class_id: 'cls-ss1-a', class_name: 'SS1 Arm A' },
  { id: 'alloc-2', teacher_id: 't-keller', teacher_name: 'Prof. Margaret Keller', subject_id: 'subj-btech', subject_name: 'Basic Technology', class_id: 'cls-ss1-a', class_name: 'SS1 Arm A' },
  { id: 'alloc-3', teacher_id: 't-thorne', teacher_name: 'Dr. David Thorne', subject_id: 'subj-j-math', subject_name: 'General Mathematics', class_id: 'cls-ss1-a', class_name: 'SS1 Arm A' },
  { id: 'alloc-4', teacher_id: 't-thorne', teacher_name: 'Dr. David Thorne', subject_id: 'subj-j-eng', subject_name: 'English Language', class_id: 'cls-ss1-a', class_name: 'SS1 Arm A' },
  { id: 'alloc-5', teacher_id: 't-keller', teacher_name: 'Prof. Margaret Keller', subject_id: 'subj-s-phys', subject_name: 'Physics', class_id: 'cls-ss1-a', class_name: 'SS1 Arm A' },
  { id: 'alloc-6', teacher_id: 't-keller', teacher_name: 'Prof. Margaret Keller', subject_id: 'subj-s-chem', subject_name: 'Chemistry', class_id: 'cls-ss2-a', class_name: 'SS2 Arm A' },
];

// 4. Students (Localized Nigerian Students with +234 phones & fee_paid status)
export const INITIAL_STUDENTS: StudentProfile[] = [
  {
    id: 'std-1',
    reg_number: 'STU-2026-089',
    access_pin: '2026',
    full_name: 'Lucas Adeleke',
    class_id: 'cls-ss1-a',
    class_grade: 'SS1 Arm A',
    session: '2025/2026',
    date_of_birth: '2010-04-12',
    parent_name: 'Mrs. Helen Adeleke',
    parent_phone: '+2348033479547',
    gpa: 3.94,
    attendance_percentage: 98.5,
    fee_paid: true,
    payment_status: 'paid',
    tuition_status: 'paid',
    created_at: '2025-09-01T08:00:00Z',
    enrolled_by_role: 'Principal',
    enrolled_by_name: 'Dr. (Mrs.) Margaret Keller',
    enrollment_date: '2025-09-01T08:00:00Z',
  },
  {
    id: 'std-2',
    reg_number: 'STU-2026-092',
    access_pin: '4190',
    full_name: 'Zainab Abubakar',
    class_id: 'cls-ss1-a',
    class_grade: 'SS1 Arm A',
    session: '2025/2026',
    date_of_birth: '2010-08-25',
    parent_name: 'Alhaji Farouk Abubakar',
    parent_phone: '+2348021234567',
    gpa: 3.88,
    attendance_percentage: 95.0,
    fee_paid: false,
    payment_status: 'unpaid',
    tuition_status: 'partial',
    created_at: '2025-09-01T08:15:00Z',
    enrolled_by_role: 'Bursar',
    enrolled_by_name: 'Finance Desk',
    enrollment_date: '2025-09-01T08:15:00Z',
  },
  {
    id: 'std-3',
    reg_number: 'STU-2026-104',
    access_pin: '8832',
    full_name: 'Emeka Okafor',
    class_id: 'cls-ss1-a',
    class_grade: 'SS1 Arm A',
    session: '2025/2026',
    date_of_birth: '2010-02-14',
    parent_name: 'Chief Jude Okafor',
    parent_phone: '+2348149876543',
    gpa: 3.65,
    attendance_percentage: 92.0,
    fee_paid: false,
    payment_status: 'pending_verification',
    tuition_status: 'pending',
    created_at: '2025-09-02T09:00:00Z',
    enrolled_by_role: 'Form Teacher',
    enrolled_by_name: 'Mrs. Hauwa Dikko',
    enrollment_date: '2025-09-02T09:00:00Z',
  },
  {
    id: 'std-4',
    reg_number: 'STU-2026-118',
    access_pin: '7521',
    full_name: 'Chioma Nwosu',
    class_id: 'cls-ss1-a',
    class_grade: 'SS1 Arm A',
    session: '2025/2026',
    date_of_birth: '2009-11-03',
    parent_name: 'Dr. Okey Nwosu',
    parent_phone: '+2347035551234',
    gpa: 4.00,
    attendance_percentage: 99.2,
    fee_paid: true,
    payment_status: 'paid',
    tuition_status: 'paid',
    created_at: '2025-09-02T10:30:00Z',
    enrolled_by_role: 'Principal',
    enrolled_by_name: 'Dr. (Mrs.) Margaret Keller',
    enrollment_date: '2025-09-02T10:30:00Z',
  },
  {
    id: 'std-5',
    reg_number: 'STU-2026-201',
    access_pin: '3341',
    full_name: 'Tunde Bakare',
    class_id: 'cls-ss1-b',
    class_grade: 'SS1 Arm B',
    session: '2025/2026',
    date_of_birth: '2010-06-18',
    parent_name: 'Pastor Samuel Bakare',
    parent_phone: '+2348051239876',
    gpa: 3.75,
    attendance_percentage: 96.0,
    fee_paid: true,
    payment_status: 'paid',
    tuition_status: 'paid',
    created_at: '2025-09-03T09:00:00Z',
    enrolled_by_role: 'Form Teacher',
    enrolled_by_name: 'Mr. Jude Alabi',
    enrollment_date: '2025-09-03T09:00:00Z',
  },
  {
    id: 'std-6',
    reg_number: 'STU-2026-301',
    access_pin: '5512',
    full_name: 'Fatimah Bello',
    class_id: 'cls-jss-1',
    class_grade: 'JSS 1',
    session: '2025/2026',
    date_of_birth: '2012-09-10',
    parent_name: 'Barrister Bello',
    parent_phone: '+2348039998877',
    gpa: 3.90,
    attendance_percentage: 98.0,
    fee_paid: true,
    payment_status: 'paid',
    tuition_status: 'paid',
    created_at: '2025-09-03T11:00:00Z',
    enrolled_by_role: 'Bursar',
    enrolled_by_name: 'Finance Desk',
    enrollment_date: '2025-09-03T11:00:00Z',
  },
  {
    id: 'std-7',
    reg_number: 'STU-2026-401',
    access_pin: '9081',
    full_name: 'Chinedu Eze',
    class_id: 'cls-pri-4',
    class_grade: 'Primary 4',
    session: '2025/2026',
    date_of_birth: '2015-03-22',
    parent_name: 'Engr. Nnamdi Eze',
    parent_phone: '+2348023456789',
    gpa: 3.82,
    attendance_percentage: 97.0,
    fee_paid: false,
    payment_status: 'unpaid',
    tuition_status: 'pending',
    created_at: '2025-09-04T08:30:00Z',
    enrolled_by_role: 'Bursar',
    enrolled_by_name: 'Finance Desk',
    enrollment_date: '2025-09-04T08:30:00Z',
  },
];

// Helper to make result
function makeResult(
  id: string,
  student: StudentProfile,
  subject: AcademicSubject,
  ca1: number,
  ca2: number,
  exam: number,
  term = '1st Term',
  session = '2025/2026'
): StudentResult {
  const total = ca1 + ca2 + exam;
  const { grade, remarks } = calculateGradeAndRemark(total);
  return {
    id,
    student_id: student.id,
    student_name: student.full_name,
    reg_number: student.reg_number,
    class_id: student.class_id,
    subject_id: subject.id,
    subject_name: subject.name,
    term,
    session,
    ca1,
    ca2,
    exam,
    total_score: total,
    grade,
    remarks,
    graded_at: '2025-10-24',
  };
}

// 5. Initial Seed Results (CA1: 20, CA2: 20, Exam: 60)
const s1 = INITIAL_STUDENTS[0]; // Lucas Adeleke
const s2 = INITIAL_STUDENTS[1]; // Zainab Abubakar
const s3 = INITIAL_STUDENTS[2]; // Emeka Okafor
const s4 = INITIAL_STUDENTS[3]; // Chioma Nwosu

const chm = INITIAL_SUBJECTS.find((s) => s.id === 'subj-s-chem')!;
const btc = INITIAL_SUBJECTS.find((s) => s.id === 'subj-btech')!;
const mth = INITIAL_SUBJECTS.find((s) => s.id === 'subj-j-math')!;
const eng = INITIAL_SUBJECTS.find((s) => s.id === 'subj-j-eng')!;

export const INITIAL_RESULTS: StudentResult[] = [
  // Chemistry in SS1 Arm A
  makeResult('res-1', s1, chm, 19, 18, 55), // Lucas: 19+18+55 = 92 (A)
  makeResult('res-2', s2, chm, 17, 16, 51), // Zainab: 17+16+51 = 84 (A)
  makeResult('res-3', s3, chm, 14, 13, 41), // Emeka: 14+13+41 = 68 (B)
  makeResult('res-4', s4, chm, 20, 19, 58), // Chioma: 20+19+58 = 97 (A)

  // Basic Technology in SS1 Arm A
  makeResult('res-5', s1, btc, 18, 19, 57), // Lucas: 18+19+57 = 94 (A)
  makeResult('res-6', s2, btc, 18, 17, 52), // Zainab: 18+17+52 = 87 (A)
  makeResult('res-7', s3, btc, 15, 14, 43), // Emeka: 15+14+43 = 72 (B)
  makeResult('res-8', s4, btc, 20, 20, 58), // Chioma: 20+20+58 = 98 (A)

  // General Mathematics in SS1 Arm A
  makeResult('res-9', s1, mth, 20, 19, 58), // Lucas: 20+19+58 = 97 (A)
  makeResult('res-10', s2, mth, 18, 18, 54), // Zainab: 18+18+54 = 90 (A)
  makeResult('res-11', s3, mth, 14, 15, 42), // Emeka: 14+15+42 = 71 (B)
  makeResult('res-12', s4, mth, 19, 20, 59), // Chioma: 19+20+59 = 98 (A)

  // English Language in SS1 Arm A
  makeResult('res-13', s1, eng, 17, 18, 52), // Lucas: 17+18+52 = 87 (A)
  makeResult('res-14', s2, eng, 19, 18, 54), // Zainab: 19+18+54 = 91 (A)
  makeResult('res-15', s3, eng, 13, 12, 38), // Emeka: 13+12+38 = 63 (C)
  makeResult('res-16', s4, eng, 19, 19, 57), // Chioma: 19+19+57 = 95 (A)
];

// 6. Tuition Fee Invoices in Nigerian Naira (₦)
export const INITIAL_INVOICES: TuitionInvoice[] = [
  {
    id: 'inv-001',
    student_id: 'std-1',
    student_name: 'Lucas Adeleke',
    reg_number: 'STU-2026-089',
    class_grade: 'SS1 Arm A',
    invoice_number: 'INV-2026-8801',
    term: '1st Term',
    due_date: '2025-10-15',
    total_amount: 245000.0,
    paid_amount: 245000.0,
    fee_paid: true,
    status: 'paid',
    paid_at: '2025-09-12',
    line_items: [
      { description: 'Term 1 Tuition & Academic Fee', amount: 180000.0 },
      { description: 'Science & Computer Lab Practical Pass', amount: 35000.0 },
      { description: 'School Uniform & Sports Wear Package', amount: 20000.0 },
      { description: 'Digital Portal & ICT Maintenance', amount: 10000.0 },
    ],
  },
  {
    id: 'inv-002',
    student_id: 'std-2',
    student_name: 'Zainab Abubakar',
    reg_number: 'STU-2026-092',
    class_grade: 'SS1 Arm A',
    invoice_number: 'INV-2026-8802',
    term: '1st Term',
    due_date: '2025-11-01',
    total_amount: 245000.0,
    paid_amount: 120000.0,
    fee_paid: false,
    status: 'partial',
    paid_at: '2025-09-20',
    line_items: [
      { description: 'Term 1 Tuition & Academic Fee', amount: 180000.0 },
      { description: 'Science Lab Practical Pass', amount: 35000.0 },
      { description: 'Digital Learning Tools', amount: 30000.0 },
    ],
  },
  {
    id: 'inv-003',
    student_id: 'std-3',
    student_name: 'Emeka Okafor',
    reg_number: 'STU-2026-104',
    class_grade: 'SS1 Arm A',
    invoice_number: 'INV-2026-8803',
    term: '1st Term',
    due_date: '2025-10-31',
    total_amount: 220000.0,
    paid_amount: 0.0,
    fee_paid: false,
    status: 'pending',
    line_items: [
      { description: 'Term 1 Tuition & Academic Fee', amount: 180000.0 },
      { description: 'Library & Development Levy', amount: 25000.0 },
      { description: 'Student Union & Clubs', amount: 15000.0 },
    ],
  },
  {
    id: 'inv-004',
    student_id: 'std-4',
    student_name: 'Chioma Nwosu',
    reg_number: 'STU-2026-118',
    class_grade: 'SS1 Arm A',
    invoice_number: 'INV-2026-8804',
    term: '1st Term',
    due_date: '2025-10-15',
    total_amount: 245000.0,
    paid_amount: 245000.0,
    fee_paid: true,
    status: 'paid',
    paid_at: '2025-09-10',
    line_items: [
      { description: 'Term 1 Tuition & Academic Fee', amount: 180000.0 },
      { description: 'Science & Computer Lab Pass', amount: 35000.0 },
      { description: 'Extracurricular Olympiad Club', amount: 30000.0 },
    ],
  },
];

// 7. Announcements
export const INITIAL_ANNOUNCEMENTS: SchoolAnnouncement[] = [
  {
    id: 'ann-1',
    title: '1st Term Continuous Assessment & WAEC Prep Commences',
    content: 'All Senior Secondary students (SS1 - SS3) are required to complete CA1 (20 Marks) and CA2 (20 Marks) ahead of the Terminal Examination. Parents can check results online in Naira fee status clearance.',
    author_name: 'Dr. Arthur Vance (Principal)',
    priority: 'high',
    published_at: '2025-10-26',
  },
];

// 8. Initial Fee Structures (Admin-published per class)
export const INITIAL_FEE_STRUCTURES: FeeStructure[] = [
  {
    id: 'fee-struct-001',
    class_id: 'cls-ss1-a',
    class_name: 'SS1 Arm A',
    term: '1st Term',
    session: '2025/2026',
    line_items: [
      { id: 'li-001-1', description: 'Tuition & Academic Fee', amount: 180000 },
      { id: 'li-001-2', description: 'School Uniform (2 sets)', amount: 15000 },
      { id: 'li-001-3', description: 'Textbooks & Workbooks', amount: 22000 },
      { id: 'li-001-4', description: 'PTA Levy', amount: 5000 },
      { id: 'li-001-5', description: 'ICT & Computer Lab Fee', amount: 8000 },
      { id: 'li-001-6', description: 'Sports & Medical Levy', amount: 5000 },
    ],
    total_amount: 235000,
    published: true,
    published_at: '2025-09-01',
    created_by: 'admin',
  },
  {
    id: 'fee-struct-002',
    class_id: 'cls-jss-1',
    class_name: 'JSS 1',
    term: '1st Term',
    session: '2025/2026',
    line_items: [
      { id: 'li-002-1', description: 'Tuition & Academic Fee', amount: 150000 },
      { id: 'li-002-2', description: 'School Uniform (2 sets)', amount: 12000 },
      { id: 'li-002-3', description: 'Textbooks & Workbooks', amount: 18000 },
      { id: 'li-002-4', description: 'PTA Levy', amount: 5000 },
      { id: 'li-002-5', description: 'ICT & Computer Lab Fee', amount: 6000 },
      { id: 'li-002-6', description: 'Sports & Medical Levy', amount: 4000 },
    ],
    total_amount: 195000,
    published: true,
    published_at: '2025-09-01',
    created_by: 'admin',
  },
  {
    id: 'fee-struct-003',
    class_id: 'cls-pri-4',
    class_name: 'Primary 4',
    term: '1st Term',
    session: '2025/2026',
    line_items: [
      { id: 'li-003-1', description: 'Tuition & Academic Fee', amount: 120000 },
      { id: 'li-003-2', description: 'School Uniform (2 sets)', amount: 10000 },
      { id: 'li-003-3', description: 'Textbooks & Workbooks', amount: 15000 },
      { id: 'li-003-4', description: 'PTA Levy', amount: 3000 },
      { id: 'li-003-5', description: 'Sports & Medical Levy', amount: 3000 },
    ],
    total_amount: 151000,
    published: true,
    published_at: '2025-09-01',
    created_by: 'admin',
  },
];

// 9. Initial Payment Receipts (submitted by students/parents)
export const INITIAL_RECEIPTS: PaymentReceipt[] = [
  {
    id: 'rcpt-001',
    student_id: 'std-3',
    student_name: 'Emeka Okafor',
    reg_number: 'STU-2026-104',
    class_grade: 'SS1 Arm A',
    class_id: 'cls-ss1-a',
    term: '1st Term',
    session: '2025/2026',
    fee_structure_id: 'fee-struct-001',
    amount_claimed: 235000,
    file_name: 'first_bank_transfer_emeka.jpg',
    file_data_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjM1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMGYxNzJhIi8+PHJlY3QgeD0iMjAiIHk9IjIwIiB3aWR0aD0iNDYwIiBoZWlnaHQ9IjMxMCIgcng9IjEyIiBmaWxsPSIjMWUyOTNiIiBzdHJva2U9IiMzMzQxNTUiIHN0cm9rZS13aWR0aD0iMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNzAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjIxIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iI2Y4ZmFmYyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RklSU1QgQkFOSyBPRiBOSUdFUklBPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iMTAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMyIgZmlsbD0iIzM4YmRmOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RUxFQ1RST05JQyBGVU5EUyBUUkFOU0ZFUiBSRUNFSVBUPC90ZXh0PjxsaW5lIHgxPSI0MCIgeTE9IjExNSIgeDI9IjQ2MCIgeTI9IjExNSIgc3Ryb2tlPSIjNDc1NTY5IiBzdHJva2Utd2lkdGg9IjEiLz48dGV4dCB4PSI1MCIgeT0iMTQ1IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk0YTNiOCI+U2VuZGVyOjwvdGV4dD48dGV4dCB4PSI0NTAiIHk9IjE0NSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjZjhmYWZjIiB0ZXh0LWFuY2hvcj0iZW5kIj5FVEhFTCBCRVJUSEEgT0tBRk9SPC90ZXh0Pjx0ZXh0IHg9IjUwIiB5PSIxNzAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTRhM2I4Ij5CZW5lZmljaWFyeTo8L3RleHQ+PHRleHQgeD0iNDUwIiB5PSIxNzAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iI2Y4ZmFmYyIgdGV4dC1hbmNob3I9ImVuZCI+QXBleCBBY2FkZW15IE5pZ2VyaWE8L3RleHQ+PHRleHQgeD0iNTAiIHk9IjE5NSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5NGEzYjgiPkFjY291bnQgTnVtYmVyOjwvdGV4dD48dGV4dCB4PSI0NTAiIHk9IjE5NSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2Y4ZmFmYyIgdGV4dC1hbmNob3I9ImVuZCI+MDEyMzQ1Njc4OTwvdGV4dD48dGV4dCB4PSI1MCIgeT0iMjIwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk0YTNiOCI+UmVmZXJlbmNlOjwvdGV4dD48dGV4dCB4PSI0NTAiIHk9IjIyMCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2E3OGJmYSIgdGV4dC1hbmNob3I9ImVuZCI+U1RVLTIwMjYtMTA0IChFbWVrYSBPY2Fmb3IpPC90ZXh0Pjx0ZXh0IHg9IjUwIiB5PSIyNDUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTRhM2I4Ij5UcmFuc2FjdGlvbiBEYXRlOjwvdGV4dD48dGV4dCB4PSI0NTAiIHk9IjI0NSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2Y4ZmFmYyIgdGV4dC1hbmNob3I9ImVuZCI+MjAtT2N0LTIwMjUgMDk6MTU6MDc8L3RleHQ+PGxpbmUgeDE9IjQwIiB5MT0iMjYwIiB4Mj0iNDYwIiB5Mj0iMjYwIiBzdHJva2U9IiM0NzU1NjkiIHN0cm9rZS13aWR0aD0iMSIvPjx0ZXh0IHg9IjUwIiB5PSIyOTAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iI2Y4ZmFmYyI+QW1vdW50IFRyYW5zZmVycmVkOjwvdGV4dD48dGV4dCB4PSI0NTAiIHk9IjI5MCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxOCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMzNGQzOTkiIHRleHQtYW5jaG9yPSJlbmQiPuKCrjIzNSwwMDAuMDA8L3RleHQ+PC9zdmc+',
    file_type: 'image/svg+xml',
    uploaded_at: '2025-10-20T09:15:00Z',
    status: 'pending_verification',
  },
  {
    id: 'rcpt-002',
    student_id: 'std-2',
    student_name: 'Zainab Abubakar',
    reg_number: 'STU-2026-092',
    class_grade: 'SS1 Arm A',
    class_id: 'cls-ss1-a',
    term: '1st Term',
    session: '2025/2026',
    fee_structure_id: 'fee-struct-001',
    amount_claimed: 235000,
    file_name: 'FirstBank_Transfer_Receipt_Zainab.pdf',
    file_data_url: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSXQovQ291bnQgMQo+PgtlbmRvYmoKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSCi9SZXNvdXJjZXMgPDwvRm9udCA8PC9GMSA1IDAgUj4+Pj4KPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDE3ND4+CnN0cmVhbQpCVAovRjEgMTggVGYKNTAgNzAwIFRECihGSVJTVCBCQU5LIE9GIE5JR0VSSUEgLSBPUkRFUiBSRUNFSVBUKVRqCjAgLTMwIFRECihTdHVkZW50OiBaYWluYWIgQWJ1YmFrYXIgW1NUVTIwMjYtMDkyXSlUagowIC0yMCBURAooQW1vdW50IFBhaWQ6IE5HTiAyMzUsMDAwLjAwKVRqCjAgLTIwIFRECihTdGF0dXM6IFRSQU5TRkVSUklORyBUTyBBUEVYIEFDQURFTVkpVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8L1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NiAwMDAwMCBuIAowMDAwMDAwMTIwIDAwMDAwIG4gCjAwMDAwMDAyMjUgMDAwMDAgbiAKMDAwMDAwMDQ1MiAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNgovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNTMzCiUlRU9G',
    file_type: 'application/pdf',
    uploaded_at: '2025-10-22T11:30:00Z',
    status: 'pending_verification',
  },
];

// 10. Initial Transactions History (Bursar Debt & Credit Ledger)
export const INITIAL_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: 'tx-001',
    receipt_id: 'rcpt-seed-1',
    student_id: 'std-1',
    student_name: 'Lucas Adeleke',
    reg_number: 'STU-2026-089',
    class_grade: 'SS1 Arm A',
    term: '1st Term',
    session: '2025/2026',
    amount_credited: 235000,
    payment_type: 'full',
    remaining_debt: 0,
    total_term_fee: 235000,
    transaction_date: '2025-09-12T10:00:00Z',
    verified_by: 'Bursary Admin',
    note: 'Paid in full via First Bank transfer',
  },
  {
    id: 'tx-002',
    receipt_id: 'rcpt-seed-2',
    student_id: 'std-2',
    student_name: 'Zainab Abubakar',
    reg_number: 'STU-2026-092',
    class_grade: 'SS1 Arm A',
    term: '1st Term',
    session: '2025/2026',
    amount_credited: 120000,
    payment_type: 'partial',
    remaining_debt: 115000,
    total_term_fee: 235000,
    transaction_date: '2025-09-20T14:30:00Z',
    verified_by: 'Bursary Admin',
    note: 'Initial partial tuition deposit',
  },
  {
    id: 'tx-003',
    receipt_id: 'rcpt-seed-3',
    student_id: 'std-4',
    student_name: 'Chioma Nwosu',
    reg_number: 'STU-2026-118',
    class_grade: 'SS1 Arm A',
    term: '1st Term',
    session: '2025/2026',
    amount_credited: 235000,
    payment_type: 'full',
    remaining_debt: 0,
    total_term_fee: 235000,
    transaction_date: '2025-09-10T11:15:00Z',
    verified_by: 'Bursary Admin',
    note: 'Paid in full via bank transfer',
  },
];

// 11. Initial Registered Teachers (Faculty Registry)
export const INITIAL_TEACHERS: TeacherProfile[] = [
  {
    id: 't-keller',
    teacher_id_code: 'TCH/2026/001',
    full_name: 'Prof. Margaret Keller',
    phone: '+2348031122334',
    email: 'm.keller@apexacademy.sch.ng',
    username: 'teacher',
    password_hash: 'teacher123',
    assigned_subject_ids: ['subj-s-chem', 'subj-s-phys', 'subj-btech'],
    form_class_id: 'cls-ss1-a',
    form_class_name: 'SS1 Arm A',
    status: 'active',
    session_token: 'token-keller-init',
    created_at: '2025-08-15T09:00:00Z',
  },
  {
    id: 't-thorne',
    teacher_id_code: 'TCH/2026/002',
    full_name: 'Dr. David Thorne',
    phone: '+2348052233445',
    email: 'd.thorne@apexacademy.sch.ng',
    username: 'dthorne',
    password_hash: 'pass4321',
    assigned_subject_ids: ['subj-j-math', 'subj-j-eng'],
    form_class_id: 'cls-ss1-b',
    form_class_name: 'SS1 Arm B',
    status: 'active',
    session_token: 'token-thorne-init',
    created_at: '2025-08-16T10:00:00Z',
  },
  {
    id: 't-dikko',
    teacher_id_code: 'TCH/2026/003',
    full_name: 'Mrs. Hauwa Dikko',
    phone: '+2348123344556',
    email: 'h.dikko@apexacademy.sch.ng',
    username: 'hdikko',
    password_hash: 'dikko2026',
    assigned_subject_ids: ['subj-s-bio', 'subj-s-lit'],
    form_class_id: 'cls-ss1-c',
    form_class_name: 'SS1 Arm C',
    status: 'active',
    session_token: 'token-dikko-init',
    created_at: '2025-08-18T11:00:00Z',
  },
];
