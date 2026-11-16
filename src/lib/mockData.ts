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
  name: 'Aegis Academy',
  motto: 'Excellence, Character, and Innovation',
  session: '2025/2026',
  academic_year: '2025/2026',
  term: '1st Term',
  address: 'Plot 12, Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
  contact_phone: '+2348033479547',
  contact_email: 'admin@aegisschools.ng',
  principal_name: 'School Administrator',
  currency_code: 'NGN',
  currency_symbol: '₦',
};

// 1. Nigerian Class Hierarchy Structure (Creche to SS3 with Arms A to F)
export const INITIAL_CLASSES: AcademicClass[] = [
  // Early Childhood
  { id: 'cls-creche', name: 'Creche', session: '2025/2026', level: 'Creche', stage: 'early_childhood', student_count: 0 },
  { id: 'cls-pre-nursery', name: 'Pre-Nursery', session: '2025/2026', level: 'Pre-Nursery', stage: 'early_childhood', student_count: 0 },
  { id: 'cls-nursery-1', name: 'Nursery 1', session: '2025/2026', level: 'Nursery 1', stage: 'early_childhood', student_count: 0 },
  { id: 'cls-nursery-2', name: 'Nursery 2', session: '2025/2026', level: 'Nursery 2', stage: 'early_childhood', student_count: 0 },
  { id: 'cls-nursery-3', name: 'Nursery 3', session: '2025/2026', level: 'Nursery 3', stage: 'early_childhood', student_count: 0 },

  // Primary (Primary 1 to Primary 6)
  { id: 'cls-pri-1', name: 'Primary 1', session: '2025/2026', level: 'Primary 1', stage: 'primary_lower', student_count: 0 },
  { id: 'cls-pri-2', name: 'Primary 2', session: '2025/2026', level: 'Primary 2', stage: 'primary_lower', student_count: 0 },
  { id: 'cls-pri-3', name: 'Primary 3', session: '2025/2026', level: 'Primary 3', stage: 'primary_lower', student_count: 0 },
  { id: 'cls-pri-4', name: 'Primary 4', session: '2025/2026', level: 'Primary 4', stage: 'primary_upper', student_count: 0 },
  { id: 'cls-pri-5', name: 'Primary 5', session: '2025/2026', level: 'Primary 5', stage: 'primary_upper', student_count: 0 },
  { id: 'cls-pri-6', name: 'Primary 6', session: '2025/2026', level: 'Primary 6', stage: 'primary_upper', student_count: 0 },

  // Junior Secondary (JSS 1 to JSS 3)
  { id: 'cls-jss-1', name: 'JSS 1', session: '2025/2026', level: 'JSS 1', stage: 'junior_secondary', student_count: 0 },
  { id: 'cls-jss-2', name: 'JSS 2', session: '2025/2026', level: 'JSS 2', stage: 'junior_secondary', student_count: 0 },
  { id: 'cls-jss-3', name: 'JSS 3', session: '2025/2026', level: 'JSS 3', stage: 'junior_secondary', student_count: 0 },

  // Senior Secondary: SS1 (Arms A, B, C, D, E, F)
  { id: 'cls-ss1-a', name: 'SS1 Arm A', session: '2025/2026', level: 'SS1', arm: 'Arm A', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss1-b', name: 'SS1 Arm B', session: '2025/2026', level: 'SS1', arm: 'Arm B', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss1-c', name: 'SS1 Arm C', session: '2025/2026', level: 'SS1', arm: 'Arm C', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss1-d', name: 'SS1 Arm D', session: '2025/2026', level: 'SS1', arm: 'Arm D', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss1-e', name: 'SS1 Arm E', session: '2025/2026', level: 'SS1', arm: 'Arm E', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss1-f', name: 'SS1 Arm F', session: '2025/2026', level: 'SS1', arm: 'Arm F', stage: 'senior_secondary', student_count: 0 },

  // Senior Secondary: SS2 (Arms A, B, C, D, E, F)
  { id: 'cls-ss2-a', name: 'SS2 Arm A', session: '2025/2026', level: 'SS2', arm: 'Arm A', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss2-b', name: 'SS2 Arm B', session: '2025/2026', level: 'SS2', arm: 'Arm B', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss2-c', name: 'SS2 Arm C', session: '2025/2026', level: 'SS2', arm: 'Arm C', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss2-d', name: 'SS2 Arm D', session: '2025/2026', level: 'SS2', arm: 'Arm D', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss2-e', name: 'SS2 Arm E', session: '2025/2026', level: 'SS2', arm: 'Arm E', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss2-f', name: 'SS2 Arm F', session: '2025/2026', level: 'SS2', arm: 'Arm F', stage: 'senior_secondary', student_count: 0 },

  // Senior Secondary: SS3 (Arms A, B, C, D, E, F)
  { id: 'cls-ss3-a', name: 'SS3 Arm A', session: '2025/2026', level: 'SS3', arm: 'Arm A', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss3-b', name: 'SS3 Arm B', session: '2025/2026', level: 'SS3', arm: 'Arm B', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss3-c', name: 'SS3 Arm C', session: '2025/2026', level: 'SS3', arm: 'Arm C', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss3-d', name: 'SS3 Arm D', session: '2025/2026', level: 'SS3', arm: 'Arm D', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss3-e', name: 'SS3 Arm E', session: '2025/2026', level: 'SS3', arm: 'Arm E', stage: 'senior_secondary', student_count: 0 },
  { id: 'cls-ss3-f', name: 'SS3 Arm F', session: '2025/2026', level: 'SS3', arm: 'Arm F', stage: 'senior_secondary', student_count: 0 },
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

// Canonical bidirectional Subject ID mapping between Frontend and Supabase
export const FRONTEND_TO_DB_SUBJECT_MAP: Record<string, string> = {
  // Senior Science
  'subj-s-chem': 'sub-che',
  'subj-s-bio': 'sub-bio',
  'subj-s-phys': 'sub-phy',
  'subj-s-fmath': 'sub-mth',
  // Core English & Mathematics (Junior & Primary)
  'subj-j-eng': 'sub-eng',
  'subj-p-eng': 'sub-eng',
  'subj-j-math': 'sub-mth',
  'subj-p-math': 'sub-mth',
  // Senior Humanities & Arts
  'subj-s-govt': 'sub-gov',
  'subj-s-lit': 'sub-eng',
  'subj-p-crs': 'sub-crs',
  'subj-p-hist': 'sub-gov',
  // Senior Commercial
  'subj-s-acct': 'sub-acc',
  'subj-s-econ': 'sub-eco',
  'subj-s-comm': 'sub-acc',
  'subj-s-mkt': 'sub-eco',
  // Junior & Vocational
  'subj-j-agric': 'sub-agr',
  'subj-j-civic': 'sub-civ',
  'subj-j-bus': 'sub-acc',
  'subj-j-soc': 'sub-civ',
  'subj-j-digtech': 'sub-mth',
  'subj-j-entrep': 'sub-acc',
  'subj-btech': 'sub-phy',
  'subj-dig-lit': 'sub-mth',
  'subj-prevoc': 'sub-agr',
  'subj-french': 'sub-eng',
  // Early Childhood & Primary Foundation
  'subj-p-lang-ng': 'sub-eng',
  'subj-p-bsci': 'sub-bio',
  'subj-p-phe': 'sub-bio',
  'subj-p-social': 'sub-civ',
  'subj-p-cca': 'sub-eng',
  'subj-ec-lang': 'sub-eng',
  'subj-ec-num': 'sub-mth',
  'subj-ec-rhymes': 'sub-eng',
  'subj-ec-social': 'sub-civ',
  'subj-ec-health': 'sub-bio',
  'subj-ec-env': 'sub-bio',
  'subj-ec-art': 'sub-eng',
  'subj-ec-pe': 'sub-bio',
  'subj-ec-rel': 'sub-crs',
  'subj-ec-sci': 'sub-bio',
};

export const DB_TO_FRONTEND_SUBJECT_MAP: Record<string, string> = {
  'sub-che': 'subj-s-chem',
  'sub-bio': 'subj-s-bio',
  'sub-phy': 'subj-s-phys',
  'sub-eng': 'subj-j-eng',
  'sub-mth': 'subj-j-math',
  'sub-gov': 'subj-s-govt',
  'sub-acc': 'subj-s-acct',
  'sub-eco': 'subj-s-econ',
  'sub-agr': 'subj-j-agric',
  'sub-civ': 'subj-j-civic',
  'sub-crs': 'subj-p-crs',
};

export function toDbSubjectId(frontendId: string): string {
  return FRONTEND_TO_DB_SUBJECT_MAP[frontendId] || frontendId;
}

export function fromDbSubjectId(dbId: string): string {
  return DB_TO_FRONTEND_SUBJECT_MAP[dbId] || dbId;
}

// 3. Teacher_Subject_Allocations
export const INITIAL_ALLOCATIONS: TeacherSubjectAllocation[] = [];

// 4. Students
export const INITIAL_STUDENTS: StudentProfile[] = [];

// 5. Results
export const INITIAL_RESULTS: StudentResult[] = [];

// 6. Invoices
export const INITIAL_INVOICES: TuitionInvoice[] = [];

// 7. Announcements
export const INITIAL_ANNOUNCEMENTS: SchoolAnnouncement[] = [];

// 8. Fee Structures
export const INITIAL_FEE_STRUCTURES: FeeStructure[] = [];

// 9. Receipts
export const INITIAL_RECEIPTS: PaymentReceipt[] = [];

// 10. Transactions
export const INITIAL_TRANSACTIONS: PaymentTransaction[] = [];

// 11. Teachers
export const INITIAL_TEACHERS: TeacherProfile[] = [];
