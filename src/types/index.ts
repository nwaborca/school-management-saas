// Educational Stage Hierarchy in the Nigerian School System
export type EducationalStage =
  | 'early_childhood'  // Creche, Pre-Nursery, Nursery 1, Nursery 2, Nursery 3
  | 'primary_lower'    // Primary 1, Primary 2, Primary 3
  | 'primary_upper'    // Primary 4, Primary 5, Primary 6
  | 'junior_secondary' // JSS 1, JSS 2, JSS 3
  | 'senior_secondary';// SS1, SS2, SS3 (Arms A, B, C, D, E, F)

export type UserRole = 'admin' | 'teacher' | 'student';

// Multi-Tenant School Record
export interface School {
  id: string;
  name: string;
  invite_code: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
  created_at: string;
}

export interface RegisterSchoolPayload {
  schoolName: string;
  adminFullName: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AuthUser {
  id: string;
  school_id?: string;
  school_name?: string;
  invite_code?: string;
  reg_number?: string;
  username?: string;
  full_name: string;
  role: UserRole;
  student_id?: string;
  class_id?: string;
  class_grade?: string;
  parent_phone?: string;
  teacher_id?: string;
  form_class_id?: string;
  assigned_class_id?: string | null;
  form_class_name?: string;
  assigned_subject_ids?: string[];
  assigned_subjects?: string[];
  is_part_time?: boolean;
  session_token?: string;
}

// 0. Teacher Profile & Registry Record
export interface TeacherProfile {
  id: string;
  school_id?: string;
  teacher_id_code: string;  // e.g. "TCH/2026/001"
  full_name: string;
  phone: string;            // Nigerian prefix +234
  email: string;
  username: string;
  password_hash: string;    // Auto-generated initial or reset password
  assigned_subject_ids: string[]; // IDs of assigned subjects
  assigned_subjects?: string[];   // Assigned subject IDs / names
  form_class_id?: string;   // If assigned as Form / Class Teacher (e.g. "cls-ss1-a")
  assigned_class_id?: string | null; // e.g. "cls-ss1-a" or null for part-time
  form_class_name?: string; // e.g. "SS1 Arm A"
  is_part_time?: boolean;   // Part-time teacher (no fixed form class)
  status: 'active' | 'suspended' | 'revoked';
  session_token: string;    // Changes upon credential reset to invalidate old sessions
  created_at: string;
  last_credential_reset?: string;
}

// Staff alias matching the database table name
export type Staff = TeacherProfile;
export type StaffProfile = TeacherProfile;

// 1. Classes: Creche to SS3 (Arms A - F)
export interface AcademicClass {
  id: string;
  school_id?: string;
  name: string;           // e.g. "SS1 Arm A", "JSS 1", "Primary 4", "Creche"
  session: string;        // e.g. "2025/2026"
  level: string;          // e.g. "SS1", "JSS 1", "Primary 4", "Nursery 2"
  arm?: string;           // e.g. "Arm A", "Arm B", "Gold", "Diamond"
  stage: EducationalStage;
  class_teacher?: string;
  student_count: number;
}

// 2. Subjects System & Educational Level Mapping
export interface AcademicSubject {
  id: string;
  school_id?: string;
  name: string;           // e.g. "Basic Tech", "Chemistry", "Nigerian Language (Igbo/Hausa/Yoruba)"
  code: string;           // e.g. "BTC-101", "CHM-201"
  stages: EducationalStage[];
  category?: 'core' | 'science' | 'arts' | 'commercial' | 'vocational' | 'early_dev' | 'general';
}

// 3. Teacher_Subject_Allocations
export interface TeacherSubjectAllocation {
  id: string;
  school_id?: string;
  teacher_id: string;
  teacher_name: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
}

// 4. Results/Grades: CA1 (20) + CA2 (20) + Exam (60) = 100
export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface StudentResult {
  id: string;
  school_id?: string;
  student_id: string;
  student_name: string;
  reg_number: string;
  class_id: string;
  subject_id: string;
  subject_name: string;
  term: string;         // e.g. "1st Term", "2nd Term", "3rd Term"
  session: string;      // e.g. "2025/2026"
  ca1: number;          // Continuous Assessment 1 (Max 20)
  ca2: number;          // Continuous Assessment 2 (Max 20)
  exam: number;         // Terminal Examination (Max 60)
  total_score: number;  // ca1 + ca2 + exam (Max 100)
  grade: LetterGrade;   // A, B, C, D, F
  remarks?: string;
  graded_at: string;
  // Audit trace provenance
  audited_by?: string;
  audit_timestamp?: string;
}

export interface PaymentTransaction {
  id: string;
  school_id?: string;
  receipt_id?: string;
  student_id: string;
  student_name: string;
  reg_number: string;
  class_grade: string;
  term: string;
  session: string;
  amount_credited: number;
  payment_type: 'full' | 'partial';
  remaining_debt: number;
  total_term_fee: number;
  transaction_date: string;
  verified_by?: string;
  note?: string;
}

// 5. Student Profile with fee_paid boolean column
export interface StudentProfile {
  id: string;
  school_id?: string;
  reg_number: string;     // e.g. "STU-2026-089"
  access_pin: string;     // e.g. "2026"
  full_name: string;
  class_id: string;
  class_grade: string;    // e.g. "SS1 Arm A"
  session: string;        // e.g. "2025/2026"
  date_of_birth?: string;
  parent_name: string;
  parent_phone: string;   // Formatted with Nigerian prefix +234
  gpa: number;
  attendance_percentage: number;
  fee_paid: boolean;      // Admin toggle: true = Paid, false = Pending/Partial
  payment_status: 'unpaid' | 'pending_verification' | 'partially_paid' | 'paid';
  tuition_status: 'paid' | 'pending' | 'partial' | 'overdue';
  created_at: string;
  // Audit provenance tracking
  enrolled_by_role?: 'Bursar' | 'Principal' | 'Form Teacher';
  enrolled_by_name?: string;
  enrollment_date?: string;
  // NDPA 2023 Compliance & Minor Data Protection Shield
  ndpa_consent_granted?: boolean;
  consent_timestamp?: string;
}

// 6. Tuition Fee Invoice in Nigerian Naira (₦)
export interface TuitionInvoice {
  id: string;
  school_id?: string;
  student_id: string;
  student_name: string;
  reg_number: string;
  class_grade: string;
  invoice_number: string;
  term: string;
  due_date: string;
  total_amount: number;   // Amount in NGN (₦)
  paid_amount: number;    // Amount in NGN (₦)
  fee_paid: boolean;      // Synchronized with student fee status
  status: 'paid' | 'pending' | 'partial' | 'overdue';
  line_items: { description: string; amount: number }[];
  paid_at?: string;
}

export interface SchoolAnnouncement {
  id: string;
  school_id?: string;
  title: string;
  content: string;
  author_name: string;
  priority: 'normal' | 'high' | 'urgent';
  published_at: string;
}

// 7. Fee Structure: Admin-built itemized fee breakdown per class per term
export interface FeeLineItem {
  id: string;
  description: string;   // e.g. "Tuition Fee", "School Uniform", "PTA Levy"
  amount: number;        // Amount in NGN (₦)
}

export interface FeeStructure {
  id: string;
  school_id?: string;
  class_id: string;
  class_name: string;
  term: string;           // e.g. "1st Term"
  session: string;        // e.g. "2025/2026"
  line_items: FeeLineItem[];
  total_amount: number;   // Auto-calculated sum of line_items
  published: boolean;     // false = draft, true = visible to students
  published_at?: string;
  created_by?: string;
}

// 8. Payment Receipt: Student-uploaded proof of bank transfer
export type ReceiptStatus = 'pending_verification' | 'approved' | 'partially_approved' | 'rejected';

export interface PaymentReceipt {
  id: string;
  school_id?: string;
  student_id: string;
  student_name: string;
  reg_number: string;
  class_grade: string;
  class_id: string;
  term?: string;           // Term-isolation: '1st Term' | '2nd Term' | '3rd Term'
  session?: string;        // Session-isolation: e.g. '2025/2026'
  fee_structure_id?: string;
  amount_claimed: number;  // Amount student says they paid (NGN)
  payment_mode?: 'full' | 'partial'; // Selection made by student
  amount_approved?: number; // Verified amount credited by bursar
  file_name: string;       // Original file name
  file_data_url: string;   // base64 data URL or public/signed URL for preview
  file_type?: string;      // MIME type (e.g. 'application/pdf', 'image/png')
  storage_path?: string;   // Supabase Storage path in 'receipts' bucket
  uploaded_at: string;
  status: ReceiptStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  admin_note?: string;
}

// 9. Staff Attendance (Geofence verified clock-in / clock-out)
export type StaffAttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT';

export interface StaffAttendance {
  id: string;
  school_id: string;
  teacher_id: string;
  teacher_name: string;
  check_in_time: string;
  clock_out_time?: string | null;
  status: StaffAttendanceStatus;
  latitude?: number | null;
  longitude?: number | null;
  distance_meters?: number | null;
  created_at: string;
}

// 10. Pickup Passes (Digital Dismissal Security)
export type PickupPassType = 'DAILY_PARENT' | 'DELEGATE_5H';
export type PickupPassStatus = 'ACTIVE' | 'USED' | 'EXPIRED';

export interface PickupPass {
  id: string;
  school_id: string;
  student_id: string;
  pass_type: PickupPassType;
  delegate_name?: string | null;
  otp_code: string;
  qr_token: string;
  status: PickupPassStatus;
  created_at: string;
  expires_at: string;
  picked_up_at?: string | null;
  verified_by_staff_id?: string | null;
}

// Nigerian WAEC / NECO / Ministry of Education Grading Standard
export function calculateGradeAndRemark(total: number): { grade: LetterGrade; remarks: string } {
  const score = Math.max(0, Math.min(100, Math.round(total)));
  if (score >= 75) {
    return { grade: 'A', remarks: 'Excellent (A1)' };
  } else if (score >= 65) {
    return { grade: 'B', remarks: 'Very Good (B2/B3)' };
  } else if (score >= 50) {
    return { grade: 'C', remarks: 'Credit (C4-C6)' };
  } else if (score >= 40) {
    return { grade: 'D', remarks: 'Pass (P7/P8)' };
  } else {
    return { grade: 'F', remarks: 'Fail (F9)' };
  }
}

// Helper: Deduce stage from class level / name reliably
export function resolveClassStage(cls?: Partial<AcademicClass> | null): EducationalStage {
  if (!cls) return 'senior_secondary';
  if (cls.stage) return cls.stage;

  const name = (cls.name || cls.level || '').toUpperCase();
  if (name.includes('CRECHE') || name.includes('NURSERY') || name.includes('PRE-NURSERY')) {
    return 'early_childhood';
  }
  if (name.includes('PRIMARY 1') || name.includes('PRIMARY 2') || name.includes('PRIMARY 3') || name.includes('PRI 1') || name.includes('PRI 2') || name.includes('PRI 3')) {
    return 'primary_lower';
  }
  if (name.includes('PRIMARY 4') || name.includes('PRIMARY 5') || name.includes('PRIMARY 6') || name.includes('PRI 4') || name.includes('PRI 5') || name.includes('PRI 6')) {
    return 'primary_upper';
  }
  if (name.includes('JSS') || name.includes('JUNIOR')) {
    return 'junior_secondary';
  }
  return 'senior_secondary';
}

// Utility: Format currency to Nigerian Naira
export function formatNaira(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
