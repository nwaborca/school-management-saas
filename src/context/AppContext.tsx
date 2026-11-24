'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AuthUser,
  UserRole,
  StaffRole,
  School,
  RegisterSchoolPayload,
  StaffAttendance,
  PickupPass,
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
  EarlyYearsCommentary,
  ClassDismissalAudit,
  SchoolAccessStatus,
} from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { generateUUID } from '@/lib/uuid';
import { calculateHaversineDistance, isLateCheckIn } from '@/lib/geofence';
import { resolveSchoolAccess, getSchoolAccessRegistry, saveSchoolAccessMeta, MASTER_DEMO_SCHOOL_ID } from '@/lib/founderAccess';
import { hashPassword } from '@/lib/security';
import { AccessGateModal } from '@/components/AccessGateModal';
import {
  SCHOOL_INFO,
  INITIAL_CLASSES,
  INITIAL_SUBJECTS,
  INITIAL_ALLOCATIONS,
  INITIAL_TEACHERS,
  INITIAL_STUDENTS,
  INITIAL_RESULTS,
  INITIAL_INVOICES,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_FEE_STRUCTURES,
  INITIAL_RECEIPTS,
  INITIAL_TRANSACTIONS,
  toDbSubjectId,
  fromDbSubjectId,
} from '@/lib/mockData';

interface AppContextType {
  schoolInfo: typeof SCHOOL_INFO;
  currentSchool: School | null;
  schools: School[];
  currentUser: AuthUser | null;
  currentRole: UserRole | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  classes: AcademicClass[];
  subjects: AcademicSubject[];
  allocations: TeacherSubjectAllocation[];
  results: StudentResult[];
  students: StudentProfile[];
  invoices: TuitionInvoice[];
  announcements: SchoolAnnouncement[];
  staffAttendance: StaffAttendance[];
  pickupPasses: PickupPass[];
  classDismissals: ClassDismissalAudit[];

  // Multi-Tenant School Registration & Management
  registerSchool: (payload: RegisterSchoolPayload) => Promise<{
    success: boolean;
    school?: School;
    inviteCode?: string;
    error?: string;
  }>;
  setCurrentSchoolById: (schoolId: string) => void;
  updateSchoolLogo: (logoUrl: string | null) => Promise<{ success: boolean; error?: string }>;
  updateSchoolBankDetails: (
    bankName: string,
    accountNumber: string,
    accountName: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Auth (Strict Mandatory School Invite Code)
  loginStudent: (regNumber: string, pin: string, inviteCode: string) => Promise<{ success: boolean; message?: string; role?: UserRole }>;
  loginStaff: (username: string, pass: string, inviteCode: string) => Promise<{ success: boolean; message?: string; role?: UserRole }>;
  logout: () => void;

  // Teacher Score Entry Portal
  updateStudentScore: (
    studentId: string,
    subjectId: string,
    classId: string,
    term: string,
    session: string,
    scores: { ca1: number; ca2: number; exam: number }
  ) => void;
  updateEarlyYearsCommentary: (
    studentId: string,
    classId: string,
    term: string,
    session: string,
    commentary: EarlyYearsCommentary
  ) => Promise<{ success: boolean; error?: string }>;

  // Admin Class Management
  promoteClass: (
    fromClassId: string,
    toClassId: string
  ) => { success: boolean; count: number; message: string };

  // Admin & Form Teacher Student Enrollment
  generateStudentProfile: (data: {
    fullName: string;
    classId: string;
    classGrade: string;
    parentName: string;
    parentPhone: string;
    customRegNumber?: string;
    customPin?: string;
    enrolledByRole?: 'Bursar' | 'Principal' | 'Form Teacher';
    enrolledByName?: string;
    ndpaConsentGranted?: boolean;
    consentTimestamp?: string;
  }) => Promise<{ success: boolean; student: StudentProfile; error?: string }>;

  // Tuition & Fee Status Toggle
  toggleStudentFeeStatus: (studentId: string, forceStatus?: boolean) => void;
  payInvoiceStub: (invoiceId: string) => void;
  addAnnouncement: (announcement: Omit<SchoolAnnouncement, 'id' | 'published_at'>) => void;

  // Fee Structure Builder (Admin)
  feeStructures: FeeStructure[];
  publishFeeStructure: (structure: Omit<FeeStructure, 'id' | 'published' | 'published_at'>) => Promise<{ success: boolean; structure: FeeStructure; error?: string }>;
  updateFeeStructure: (id: string, updates: Partial<FeeStructure>) => void;
  deleteFeeStructure: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Receipt Verification & Partial Payment Ledger
  receipts: PaymentReceipt[];
  transactions: PaymentTransaction[];
  uploadReceipt: (studentId: string, data: {
    fileName: string;
    fileDataUrl: string;
    amountClaimed: number;
    paymentMode?: 'full' | 'partial';
    feeStructureId?: string;
    term?: string;
    session?: string;
    fileType?: string;
    storagePath?: string;
  }) => Promise<{ success: boolean; receipt?: PaymentReceipt; error?: string }>;
  approveReceipt: (receiptId: string) => void;
  confirmPartialPayment: (receiptId: string, approvedAmount?: number, bursarNote?: string) => void;
  rejectReceipt: (receiptId: string, note?: string) => void;
  getStudentTermLedger: (studentId: string, term: string) => {
    totalTermFee: number;
    totalPaid: number;
    remainingBalance: number;
    paymentStatus: 'unpaid' | 'pending_verification' | 'partially_paid' | 'paid';
    isUnlocked: boolean;
  };
  // Teacher Registry & Security Controls (Admin)
  teachers: TeacherProfile[];
  registerTeacher: (data: {
    fullName: string;
    phone: string;
    email: string;
    role?: StaffRole;
    assignedSubjectIds: string[];
    assignedSubjects?: string[];
    formClassId?: string;
    assignedClassId?: string | null;
    isPartTime?: boolean;
  }) => { teacher: TeacherProfile; initialPassword: string };
  updateTeacher: (
    teacherId: string,
    updates: {
      fullName?: string;
      phone?: string;
      email?: string;
      role?: StaffRole;
      assignedSubjectIds?: string[];
      assignedSubjects?: string[];
      formClassId?: string;
      assignedClassId?: string | null;
      isPartTime?: boolean;
      resetCredentials?: boolean;
    }
  ) => { success: boolean; newPassword?: string };
  deleteTeacher: (teacherId: string) => void;
  // Theme Management
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Global Result Publishing Gate
  resultsPublished: boolean;
  toggleResultsPublished: () => void;

  // Admin Self-Service Password Reset
  updateAdminPassword: (currentPass: string, newPass: string) => { success: boolean; message?: string };

  // Phase 3: Geofence & Staff Attendance
  updateSchoolGeofence: (params: {
    latitude: number;
    longitude: number;
    geofenceRadiusMeters?: number;
    resumptionCutoffTime?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  clockInStaff: (params: {
    scannedPayload: string;
    latitude?: number;
    longitude?: number;
  }) => Promise<{ success: boolean; record?: StaffAttendance; message?: string; distanceMeters?: number }>;
  clockOutStaff: (attendanceId: string) => Promise<{ success: boolean; message?: string }>;

  // Phase 4: Jumia-Style Safe Pick-Up & Dismissal Security
  generateDailyParentPass: (studentId: string) => Promise<{ success: boolean; pass?: PickupPass; error?: string }>;
  generateDelegatePass: (studentId: string, delegateName: string) => Promise<{ success: boolean; pass?: PickupPass; error?: string }>;
  revokePickupPass: (passId: string) => Promise<{ success: boolean; error?: string }>;
  verifyAndHandoverPass: (params: {
    codeOrToken: string;
    verifiedByStaffId?: string;
  }) => Promise<{
    success: boolean;
    pass?: PickupPass;
    student?: StudentProfile;
    error?: string;
    reason?: 'EXPIRED' | 'USED' | 'INVALID' | 'WRONG_SCHOOL';
  }>;
  confirmGateRelease: (params: {
    passId: string;
    securityStaffId?: string;
    securityStaffName?: string;
  }) => Promise<{
    success: boolean;
    pass?: PickupPass;
    error?: string;
  }>;

  // Phase 5: Class Dismissal & Safe Pick-Up Accountability
  markClassEmpty: (params: {
    classId: string;
    className: string;
    teacherId: string;
    teacherName: string;
  }) => Promise<{
    success: boolean;
    audit?: ClassDismissalAudit;
    unverifiedCount: number;
    unverifiedStudents: { id: string; name: string }[];
    error?: string;
  }>;
  reopenClassDismissal: (classId: string) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to set cross-browser, mobile-resilient session cookie and multi-store fallback
function setSessionCookie(user: AuthUser | null, school?: School | null) {
  if (typeof document === 'undefined') return;
  try {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    if (!user) {
      document.cookie = `apex_auth_user=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
      document.cookie = `aegis_auth_school=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
      try { sessionStorage.removeItem('apex_auth_user'); } catch {}
      try { localStorage.removeItem('apex_auth_user'); } catch {}
      try { sessionStorage.removeItem('aegis_auth_school'); } catch {}
      try { localStorage.removeItem('aegis_auth_school'); } catch {}
    } else {
      const encoded = encodeURIComponent(JSON.stringify(user));
      // 7 days expiration with explicit Lax and HTTPS Secure guard
      document.cookie = `apex_auth_user=${encoded}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
      try { sessionStorage.setItem('apex_auth_user', JSON.stringify(user)); } catch {}
      try { localStorage.setItem('apex_auth_user', JSON.stringify(user)); } catch {}

      if (school) {
        const encodedSchool = encodeURIComponent(JSON.stringify(school));
        document.cookie = `aegis_auth_school=${encodedSchool}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
        try { sessionStorage.setItem('aegis_auth_school', JSON.stringify(school)); } catch {}
        try { localStorage.setItem('aegis_auth_school', JSON.stringify(school)); } catch {}
      }
    }
  } catch {}
}

function getSavedSchool(): School | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(/(?:^|;\s*)aegis_auth_school=([^;]+)/);
    if (match && match[1]) {
      return JSON.parse(decodeURIComponent(match[1]));
    }
  } catch {}
  try {
    const sessionData = sessionStorage.getItem('aegis_auth_school');
    if (sessionData) {
      return JSON.parse(sessionData);
    }
  } catch {}
  try {
    const localData = localStorage.getItem('aegis_auth_school');
    if (localData) {
      return JSON.parse(localData);
    }
  } catch {}
  return null;
}

function getSessionCookie(): AuthUser | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(/(?:^|;\s*)apex_auth_user=([^;]+)/);
    if (match && match[1]) {
      return JSON.parse(decodeURIComponent(match[1]));
    }
  } catch {}
  try {
    const sessionData = sessionStorage.getItem('apex_auth_user');
    if (sessionData) {
      return JSON.parse(sessionData);
    }
  } catch {}
  try {
    const localData = localStorage.getItem('apex_auth_user');
    if (localData) {
      return JSON.parse(localData);
    }
  } catch {}
  return null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const DEFAULT_SCHOOL: School = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Aegis Academy Nigeria',
    invite_code: 'AEGIS-2026',
    latitude: 6.5244,
    longitude: 3.3792,
    geofence_radius_meters: 150,
    bank_name: 'First Bank of Nigeria',
    bankName: 'First Bank of Nigeria',
    account_number: '0123456789',
    accountNumber: '0123456789',
    account_name: 'Aegis Academy Nigeria',
    accountName: 'Aegis Academy Nigeria',
    access_status: 'ACTIVE',
    plan_label: 'ACTIVE_TERM',
    access_expires_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };

  const initialSavedSchool = typeof window !== 'undefined' ? getSavedSchool() : null;
  const isCustomTenantSession = Boolean(
    initialSavedSchool &&
    initialSavedSchool.id !== DEFAULT_SCHOOL.id &&
    initialSavedSchool.id !== MASTER_DEMO_SCHOOL_ID &&
    initialSavedSchool.invite_code?.toUpperCase() !== 'AEGIS-2026'
  );

  const [schools, setSchools] = useState<School[]>([DEFAULT_SCHOOL]);
  const [accessGateBlocked, setAccessGateBlocked] = useState<SchoolAccessStatus | null>(null);
  const [currentSchool, setCurrentSchool] = useState<School | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = getSavedSchool();
      if (saved) return saved;
    }
    return DEFAULT_SCHOOL;
  });
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendance[]>([]);
  const [pickupPasses, setPickupPasses] = useState<PickupPass[]>([]);
  const [classDismissals, setClassDismissals] = useState<ClassDismissalAudit[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('aegis_class_dismissals');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [classes, setClasses] = useState<AcademicClass[]>(INITIAL_CLASSES);
  const [subjects] = useState<AcademicSubject[]>(INITIAL_SUBJECTS);
  const [allocations] = useState<TeacherSubjectAllocation[]>(INITIAL_ALLOCATIONS);
  const [results, setResults] = useState<StudentResult[]>(() => isCustomTenantSession ? [] : INITIAL_RESULTS);
  const [students, setStudents] = useState<StudentProfile[]>(() => isCustomTenantSession ? [] : INITIAL_STUDENTS);
  const [invoices, setInvoices] = useState<TuitionInvoice[]>(INITIAL_INVOICES);
  const [announcements, setAnnouncements] = useState<SchoolAnnouncement[]>(() => isCustomTenantSession ? [] : INITIAL_ANNOUNCEMENTS);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>(() => isCustomTenantSession ? [] : INITIAL_FEE_STRUCTURES);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>(() => isCustomTenantSession ? [] : INITIAL_RECEIPTS);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(INITIAL_TRANSACTIONS);
  const [teachers, setTeachers] = useState<TeacherProfile[]>(() => isCustomTenantSession ? [] : INITIAL_TEACHERS);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [resultsPublished, setResultsPublished] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('apex_results_published');
        if (cached !== null) return cached === 'true';
      } catch {}
    }
    return false;
  });
  const [adminPassword, setAdminPassword] = useState<string>('admin123');

  // Avoid unnecessary re-fetch loops
  const isFetchingRef = useRef(false);

  // Default to clean high-contrast light enterprise theme
  useEffect(() => {
    try {
      setTheme('light');
      localStorage.setItem('apex_theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } catch {}
  }, []);

  const toggleTheme = () => {
    setTheme('light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    try {
      localStorage.setItem('apex_theme', 'light');
    } catch {}
  };

  const toggleResultsPublished = () => {
    setResultsPublished((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem('apex_results_published', String(nextVal));
      } catch {}

      // Persist global gate setting via secure tenant data gateway
      void mutateTenantData({
        action: 'upsert',
        table: 'fee_structures',
        payload: {
          id: '00000000-0000-0000-0000-000000000001',
          class_id: 'cls-creche',
          class_name: 'SYSTEM_SETTINGS_RESULTS_GATE',
          term: 'GLOBAL_GATE',
          session: '2025/2026',
          line_items: [{ name: 'results_published', amount: 0 }],
          total_amount: 0,
          published: nextVal,
          published_at: new Date().toISOString(),
        },
      });

      return nextVal;
    });
  };

  // Purge tenant-scoped in-memory state on tenant switch or logout
  const purgeTenantState = useCallback(() => {
    setStudents([]);
    setTeachers([]);
    setReceipts([]);
    setResults([]);
    setFeeStructures([]);
    setPickupPasses([]);
    setStaffAttendance([]);
    setAnnouncements([]);
    setClassDismissals([]);
  }, []);

  // Generic helper for authenticated server-side mutations through /api/tenant/data
  const mutateTenantData = async (params: {
    action: 'insert' | 'upsert' | 'update' | 'delete';
    table: string;
    payload?: any;
    filter?: Record<string, any>;
    targetSchoolId?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const activeSchoolId = params.targetSchoolId || currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;
      const res = await fetch('/api/tenant/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-school-id': activeSchoolId,
        },
        body: JSON.stringify({
          ...params,
          targetSchoolId: activeSchoolId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        return { success: true };
      }
      return { success: false, message: data?.message || 'Server mutation rejected' };
    } catch (err: any) {
      console.warn('mutateTenantData network warning:', err);
      return { success: false, message: err?.message || 'Network exception' };
    }
  };

  const updateAdminPassword = (currentPass: string, newPass: string) => {
    if (currentPass !== adminPassword) {
      return { success: false, message: 'Current password does not match active admin account.' };
    }
    if (newPass.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' };
    }
    setAdminPassword(newPass);
    return { success: true };
  };

  // Helper to normalize teacher record from Supabase or memory
  const normalizeTeacher = (t: any): TeacherProfile => {
    const assignedIds = t.assigned_subject_ids || t.assigned_subjects || [];
    return {
      id: t.id,
      school_id: t.school_id || DEFAULT_SCHOOL.id,
      teacher_id_code: t.teacher_id_code || t.staff_id_code || `TCH/2026/${String(t.id).slice(-3)}`,
      full_name: t.full_name || 'Teacher',
      phone: t.phone || '+2348000000000',
      email: t.email || `${t.username || t.id}@school.edu.ng`,
      username: t.username || `tch_${t.id}`,
      password_hash: t.password_hash || '',
      role: t.role === 'gate_security' || t.role === 'GATE_SECURITY' ? 'gate_security' : (t.role === 'admin' ? 'admin' : 'teacher'),
      assigned_subject_ids: Array.isArray(assignedIds) ? assignedIds : [],
      assigned_subjects: Array.isArray(assignedIds) ? assignedIds : [],
      form_class_id: t.is_part_time ? undefined : (t.form_class_id || (t.assigned_class_id ?? undefined)),
      assigned_class_id: t.is_part_time ? null : (t.assigned_class_id ?? t.form_class_id ?? null),
      form_class_name: t.is_part_time ? undefined : t.form_class_name,
      is_part_time: Boolean(t.is_part_time),
      status: t.status || 'active',
      session_token: t.session_token || `token-${Date.now()}`,
      created_at: t.created_at || new Date().toISOString(),
      last_credential_reset: t.last_credential_reset,
    };
  };

  // Helper to normalize result record from Supabase
  const normalizeResult = (r: any, studentList: StudentProfile[] = students): StudentResult => {
    const student = studentList.find((s) => s.id === r.student_id);
    const resolvedSubjectId = fromDbSubjectId(r.subject_id);
    const subject = subjects.find((sb) => sb.id === resolvedSubjectId || sb.id === r.subject_id);
    const ca1 = Number(r.ca1) || 0;
    const ca2 = Number(r.ca2) || 0;
    const exam = Number(r.exam) || 0;
    const total_score = Number(r.total_score) || (ca1 + ca2 + exam);

    // Extract Early Years commentary data if packed in r.early_years_data or parsed from r.remarks JSON
    let earlyYearsData = r.early_years_data || null;
    if (!earlyYearsData && typeof r.remarks === 'string' && r.remarks.startsWith('EY_DATA:')) {
      try {
        earlyYearsData = JSON.parse(r.remarks.replace('EY_DATA:', ''));
      } catch {}
    }

    return {
      id: r.id,
      school_id: r.school_id || DEFAULT_SCHOOL.id,
      student_id: r.student_id,
      student_name: r.student_name || student?.full_name || 'Student',
      reg_number: r.reg_number || student?.reg_number || 'N/A',
      class_id: r.class_id,
      subject_id: resolvedSubjectId,
      subject_name: r.subject_name || subject?.name || 'Subject',
      term: r.term,
      session: r.session,
      ca1,
      ca2,
      exam,
      total_score,
      grade: r.grade,
      remarks: r.remarks,
      early_years_data: earlyYearsData,
      audited_by: r.audited_by,
      graded_at: r.graded_at || new Date().toISOString().split('T')[0],
      audit_timestamp: r.audit_timestamp,
    };
  };
  // Helper to normalize student record from Supabase or memory
  const normalizeStudent = (s: any): StudentProfile => {
    return {
      id: s.id,
      school_id: s.school_id || DEFAULT_SCHOOL.id,
      reg_number: s.reg_number || 'STU-UNKNOWN',
      access_pin: s.access_pin || '2026',
      full_name: s.full_name || 'Student',
      class_id: s.class_id,
      class_grade: s.class_grade || 'SS1 Arm A',
      session: s.session || '2025/2026',
      date_of_birth: s.date_of_birth || undefined,
      parent_name: s.parent_name || 'Parent/Guardian',
      parent_phone: s.parent_phone || '+2348000000000',
      gpa: Number(s.gpa) || 3.5,
      attendance_percentage: Number(s.attendance_percentage) || 100.0,
      fee_paid: Boolean(s.fee_paid),
      payment_status: s.payment_status || 'unpaid',
      tuition_status: s.tuition_status || (s.fee_paid ? 'paid' : 'pending'),
      created_at: s.created_at || new Date().toISOString(),
      enrolled_by_role: s.enrolled_by_role,
      enrolled_by_name: s.enrolled_by_name,
      enrollment_date: s.enrollment_date || s.created_at,
      ndpa_consent_granted: s.ndpa_consent_granted !== undefined ? Boolean(s.ndpa_consent_granted) : true,
      consent_timestamp: s.consent_timestamp || s.created_at,
    };
  };

  // Helper to normalize payment receipt from Supabase or storage with defensive student & class mapping
  const normalizeReceipt = (r: any, studentList?: StudentProfile[], classList?: AcademicClass[]): PaymentReceipt => {
    const rawUrl =
      r.file_data_url ||
      r.fileDataUrl ||
      r.proofUrl ||
      r.proof_url ||
      r.receiptUrl ||
      r.receipt_url ||
      r.imageUrl ||
      r.image_url ||
      '';

    const rawFileName =
      r.file_name ||
      r.fileName ||
      r.name ||
      'receipt_document';

    // Parse packed student & class details if stored in admin_note / remarks
    let noteStudentName: string | undefined;
    let noteAdmissionNo: string | undefined;
    let noteClassName: string | undefined;

    const rawNote = r.admin_note || r.adminNote || r.remarks || '';
    if (typeof rawNote === 'string' && rawNote.includes('AEGIS_RECEIPT_META:')) {
      try {
        const metaStr = rawNote.split('AEGIS_RECEIPT_META:')[1];
        if (metaStr) {
          const parsedMeta = JSON.parse(metaStr);
          noteStudentName = parsedMeta.student_name || parsedMeta.studentName;
          noteAdmissionNo = parsedMeta.admission_no || parsedMeta.reg_number || parsedMeta.regNumber;
          noteClassName = parsedMeta.class_name || parsedMeta.class_grade || parsedMeta.classGrade;
        }
      } catch {}
    }

    const studentId = r.student_id || r.studentId;
    const admissionNoCandidate = r.reg_number || r.regNumber || r.admission_no || r.admissionNo || noteAdmissionNo;

    // Resolve matching student from provided studentList or existing state
    const pool = studentList && studentList.length > 0 ? studentList : students;
    const matchedStudent = pool.find((s) => 
      (studentId && s.id === studentId) || 
      (admissionNoCandidate && s.reg_number.toUpperCase() === String(admissionNoCandidate).toUpperCase())
    );

    const classPool = classList && classList.length > 0 ? classList : classes;
    const matchedClass = classPool.find((c) => c.id === (r.class_id || r.classId || matchedStudent?.class_id));

    const resolvedStudentName =
      matchedStudent?.full_name ||
      r.student_name ||
      r.studentName ||
      noteStudentName ||
      'Student';

    const resolvedRegNumber =
      matchedStudent?.reg_number ||
      r.reg_number ||
      r.regNumber ||
      r.admission_no ||
      r.admissionNo ||
      noteAdmissionNo ||
      'N/A';

    const resolvedClassGrade =
      matchedStudent?.class_grade ||
      matchedClass?.name ||
      r.class_grade ||
      r.classGrade ||
      r.class_name ||
      r.className ||
      r.class_level ||
      noteClassName ||
      'Class';

    return {
      id: r.id,
      school_id: r.school_id || DEFAULT_SCHOOL.id,
      student_id: studentId || matchedStudent?.id || '',
      student_name: resolvedStudentName,
      reg_number: resolvedRegNumber,
      class_grade: resolvedClassGrade,
      class_id: r.class_id || r.classId || matchedStudent?.class_id || '',
      term: r.term || '1st Term',
      session: r.session || SCHOOL_INFO.session || '2025/2026',
      fee_structure_id: r.fee_structure_id || r.feeStructureId,
      amount_claimed: Number(r.amount_claimed ?? r.amountClaimed ?? 0),
      payment_mode: r.payment_mode || r.paymentMode || 'full',
      amount_approved: r.amount_approved !== undefined ? Number(r.amount_approved) : (r.amountApproved !== undefined ? Number(r.amountApproved) : undefined),
      file_name: rawFileName,
      file_data_url: typeof rawUrl === 'string' ? rawUrl : '',
      file_type: r.file_type || r.fileType || (rawFileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      storage_path: r.storage_path || r.storagePath || undefined,
      uploaded_at: r.uploaded_at || r.uploadedAt || r.created_at || new Date().toISOString(),
      status: r.status || 'pending_verification',
      reviewed_by: r.reviewed_by || r.reviewedBy,
      reviewed_at: r.reviewed_at || r.reviewedAt,
      admin_note: r.admin_note || r.adminNote,
    };
  };

  // Helper to normalize staff attendance from Supabase
  const normalizeAttendance = (a: any): StaffAttendance => {
    return {
      id: a.id,
      school_id: a.school_id || DEFAULT_SCHOOL.id,
      teacher_id: a.teacher_id,
      teacher_name: a.teacher_name || 'Staff Member',
      check_in_time: a.check_in_time || new Date().toISOString(),
      clock_out_time: a.clock_out_time || null,
      status: a.status || 'PRESENT',
      latitude: a.latitude !== undefined ? Number(a.latitude) : null,
      longitude: a.longitude !== undefined ? Number(a.longitude) : null,
      distance_meters: a.distance_meters !== undefined ? Number(a.distance_meters) : null,
      created_at: a.created_at || new Date().toISOString(),
    };
  };

  // Helper to normalize pickup pass from Supabase
  const normalizePickupPass = (p: any): PickupPass => {
    return {
      id: p.id,
      school_id: p.school_id || DEFAULT_SCHOOL.id,
      student_id: p.student_id,
      pass_type: p.pass_type || 'DAILY_PARENT',
      delegate_name: p.delegate_name || null,
      otp_code: p.otp_code || '000000',
      qr_token: p.qr_token || `QR-${p.id}`,
      status: p.status || 'ACTIVE',
      created_at: p.created_at || new Date().toISOString(),
      expires_at: p.expires_at || new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
      picked_up_at: p.picked_up_at || null,
      verified_by_staff_id: p.verified_by_staff_id || null,
      gate_released_at: p.gate_released_at || null,
      released_by_security_id: p.released_by_security_id || null,
    };
  };

  // Live Cloud Fetch from Supabase with granular per-query error isolation
  const fetchLiveData = useCallback(async (targetSchoolId?: string) => {
    if (isFetchingRef.current) return;

    // Require a valid resolvedSchoolId. If no user or school context is active yet, return immediately
    const resolvedSchoolId = targetSchoolId || currentUser?.school_id || currentSchool?.id;
    if (!resolvedSchoolId) return;

    isFetchingRef.current = true;
    try {
      const activeSchoolId = resolvedSchoolId;

      // 1. First attempt fast, authenticated server gateway fetch via /api/tenant/data
      let gatewaySucceeded = false;
      try {
        const gatewayRes = await fetch(`/api/tenant/data?schoolId=${encodeURIComponent(activeSchoolId)}`, {
          headers: {
            'x-school-id': activeSchoolId,
          },
        });
        const gatewayPayload = await gatewayRes.json().catch(() => null);

        if (gatewayRes.ok && gatewayPayload?.success && gatewayPayload.data) {
          const gData = gatewayPayload.data;
          gatewaySucceeded = true;
          const isMasterDemoSchool = activeSchoolId === DEFAULT_SCHOOL.id || activeSchoolId === MASTER_DEMO_SCHOOL_ID;

          let activeStudentList = students;
          if (Array.isArray(gData.students)) {
            if (gData.students.length > 0) {
              const normalizedStudents = gData.students.map(normalizeStudent);
              activeStudentList = normalizedStudents;
              setStudents(normalizedStudents);

              // If currentUser is a student, ensure their in-memory student profile is matched and enriched
              if (currentUser?.role === 'student') {
                const matchedActiveStudent = normalizedStudents.find(
                  (s: StudentProfile) =>
                    s.id === currentUser.student_id ||
                    s.reg_number.toUpperCase() === (currentUser.reg_number || '').toUpperCase()
                );
                if (matchedActiveStudent) {
                  setCurrentUser((prevUser) =>
                    prevUser
                      ? {
                          ...prevUser,
                          student_id: matchedActiveStudent.id,
                          class_id: matchedActiveStudent.class_id,
                          class_grade: matchedActiveStudent.class_grade,
                          full_name: matchedActiveStudent.full_name,
                          parent_phone: matchedActiveStudent.parent_phone,
                        }
                      : null
                  );
                }
              }
            } else if (!isMasterDemoSchool) {
              // If current user is a logged-in student, preserve their single profile from session instead of wiping
              if (currentUser?.role === 'student' && currentUser.student_id) {
                // keep current student
              } else {
                activeStudentList = [];
                setStudents([]);
              }
            }
          }

          let activeClassList = classes;
          if (Array.isArray(gData.classes)) {
            if (gData.classes.length > 0) {
              activeClassList = gData.classes as AcademicClass[];
              setClasses(activeClassList);
            }
          }

          if (Array.isArray(gData.staff)) {
            if (gData.staff.length > 0) {
              setTeachers(gData.staff.map(normalizeTeacher));
            } else if (!isMasterDemoSchool) {
              setTeachers([]);
            }
          }

          if (Array.isArray(gData.termResults)) {
            if (gData.termResults.length > 0) {
              setResults(gData.termResults.map((r: any) => normalizeResult(r, activeStudentList)));
            } else if (!isMasterDemoSchool) {
              setResults([]);
            }
          }

          if (Array.isArray(gData.feeStructures)) {
            if (gData.feeStructures.length > 0) {
              setFeeStructures(gData.feeStructures as FeeStructure[]);
            } else if (!isMasterDemoSchool) {
              setFeeStructures([]);
            }
          }

          if (Array.isArray(gData.receipts)) {
            if (gData.receipts.length > 0) {
              setReceipts(gData.receipts.map((r: any) => normalizeReceipt(r, activeStudentList, activeClassList)));
            } else if (!isMasterDemoSchool) {
              setReceipts([]);
            }
          }

          if (Array.isArray(gData.staffAttendance)) {
            if (gData.staffAttendance.length > 0) {
              setStaffAttendance(gData.staffAttendance.map(normalizeAttendance));
            } else if (!isMasterDemoSchool) {
              setStaffAttendance([]);
            }
          }

          if (Array.isArray(gData.pickupPasses)) {
            if (gData.pickupPasses.length > 0) {
              setPickupPasses(gData.pickupPasses.map(normalizePickupPass));
            } else if (!isMasterDemoSchool) {
              setPickupPasses([]);
            }
          }

          if (Array.isArray(gData.announcements)) {
            if (gData.announcements.length > 0) {
              setAnnouncements(gData.announcements);
            } else if (!isMasterDemoSchool) {
              setAnnouncements([]);
            }
          }

          if (Array.isArray(gData.classDismissalAudits)) {
            if (gData.classDismissalAudits.length > 0) {
              setClassDismissals(gData.classDismissalAudits);
            }
          }

          if (gData.school) {
            const rawSchool = gData.school;
            const enrichedSchool: School = {
              ...rawSchool,
              logo_url: rawSchool.logo_url || null,
              logoUrl: rawSchool.logo_url || null,
              bank_name: rawSchool.bank_name || null,
              bankName: rawSchool.bank_name || null,
              account_number: rawSchool.account_number || null,
              accountNumber: rawSchool.account_number || null,
              account_name: rawSchool.account_name || null,
              accountName: rawSchool.account_name || null,
            };
            setSchools((prev) => (prev.some((s) => s.id === enrichedSchool.id) ? prev.map((s) => s.id === enrichedSchool.id ? enrichedSchool : s) : [enrichedSchool, ...prev]));
            setCurrentSchool(enrichedSchool);
            setSessionCookie(currentUser, enrichedSchool);
          }
        }
      } catch (gatewayErr) {
        console.warn('Tenant data gateway fetch note:', gatewayErr);
      }
    } catch (err) {
      console.warn('Non-fatal error in fetchLiveData (safely falling back to default/cached data):', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [currentSchool?.id, currentUser?.school_id]);

  // 1. Initial Mount: Authenticate session and trigger Cloud Sync (strictly run once on mount)
  const isInitialMountRef = useRef(false);
  useEffect(() => {
    if (isInitialMountRef.current) return;
    isInitialMountRef.current = true;

    try {
      const cookieUser = getSessionCookie();
      const savedSchool = getSavedSchool();
      if (savedSchool) {
        setCurrentSchool(savedSchool);
      }
      if (cookieUser) {
        setCurrentUser(cookieUser);
        const targetId = cookieUser.school_id || savedSchool?.id;
        if (isSupabaseConfigured() && targetId) {
          fetchLiveData(targetId);
        }
      } else {
        setCurrentUser(null);
        setSessionCookie(null);
      }
    } catch {} finally {
      setIsAuthReady(true);
    }

    // If a valid tenant session exists, sync live data for that tenant.
    // If no user or saved school is authenticated, DO NOT fetch unscoped rows.
    if (isSupabaseConfigured()) {
      const cookieUser = getSessionCookie();
      const savedSchool = getSavedSchool();
      const targetId = cookieUser?.school_id || savedSchool?.id;
      if (targetId) {
        fetchLiveData(targetId);
      }
    }
  }, [fetchLiveData]);

  // 2. Real-Time Supabase Cloud Subscriptions (`supabase.channel`) across all clients
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;

    // Realtime listener for 'staff' (Teachers, HODs, Faculty)
    const staffChannel = supabase
      .channel(`public:staff_realtime:${activeSchoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff', filter: `school_id=eq.${activeSchoolId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = normalizeTeacher(payload.new);
            setTeachers((prev) => {
              if (prev.some((t) => t.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = normalizeTeacher(payload.new);
            setTeachers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setTeachers((prev) => prev.filter((t) => t.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    // Realtime listener for 'students'
    const studentChannel = supabase
      .channel(`public:students_realtime:${activeSchoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students', filter: `school_id=eq.${activeSchoolId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = normalizeStudent(payload.new);
            setStudents((prev) => {
              if (prev.some((s) => s.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = normalizeStudent(payload.new);
            setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setStudents((prev) => prev.filter((s) => s.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    // Realtime listener for 'term_results' (Grading & Continuous Assessment)
    const resultsChannel = supabase
      .channel(`public:term_results_realtime:${activeSchoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'term_results', filter: `school_id=eq.${activeSchoolId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = normalizeResult(payload.new);
            setResults((prev) => {
              if (prev.some((r) => r.id === inserted.id)) return prev;
              const filtered = prev.filter(
                (r) =>
                  !(
                    r.student_id === inserted.student_id &&
                    r.subject_id === inserted.subject_id &&
                    r.term === inserted.term &&
                    r.session === inserted.session
                  )
              );
              return [inserted, ...filtered];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = normalizeResult(payload.new);
            setResults((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setResults((prev) => prev.filter((r) => r.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    // Realtime listener for 'receipts' (Fees & Bursar Verification)
    const receiptsChannel = supabase
      .channel(`public:receipts_realtime:${activeSchoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'receipts', filter: `school_id=eq.${activeSchoolId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = normalizeReceipt(payload.new, students, classes);
            setReceipts((prev) => {
              if (prev.some((rc) => rc.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = normalizeReceipt(payload.new, students, classes);
            setReceipts((prev) => prev.map((rc) => (rc.id === updated.id ? updated : rc)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setReceipts((prev) => prev.filter((rc) => rc.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    // Realtime listener for 'fee_structures' (Tuition & Fee Schedules)
    const feesChannel = supabase
      .channel(`public:fee_structures_realtime:${activeSchoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fee_structures', filter: `school_id=eq.${activeSchoolId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as FeeStructure;
            if (inserted.id === '00000000-0000-0000-0000-000000000001') {
              setResultsPublished(Boolean(inserted.published));
              try {
                localStorage.setItem('apex_results_published', String(Boolean(inserted.published)));
              } catch {}
            }
            setFeeStructures((prev) => {
              if (prev.some((fs) => fs.id === inserted.id)) return prev;
              const filtered = prev.filter(
                (f) => !(f.class_id === inserted.class_id && f.term === inserted.term && f.session === inserted.session)
              );
              return [inserted, ...filtered];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as FeeStructure;
            if (updated.id === '00000000-0000-0000-0000-000000000001') {
              setResultsPublished(Boolean(updated.published));
              try {
                localStorage.setItem('apex_results_published', String(Boolean(updated.published)));
              } catch {}
            }
            setFeeStructures((prev) => prev.map((fs) => (fs.id === updated.id ? updated : fs)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setFeeStructures((prev) => prev.filter((fs) => fs.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    // Realtime listener for 'staff_attendance' (Geofenced Attendance)
    const attendanceChannel = supabase
      .channel(`public:staff_attendance_realtime:${activeSchoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_attendance', filter: `school_id=eq.${activeSchoolId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = normalizeAttendance(payload.new);
            setStaffAttendance((prev) => {
              if (prev.some((a) => a.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = normalizeAttendance(payload.new);
            setStaffAttendance((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setStaffAttendance((prev) => prev.filter((a) => a.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    // Realtime listener for 'pickup_passes' (Digital Pick-Up Authentication)
    const pickupPassesChannel = supabase
      .channel(`public:pickup_passes_realtime:${activeSchoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_passes', filter: `school_id=eq.${activeSchoolId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = normalizePickupPass(payload.new);
            setPickupPasses((prev) => {
              if (prev.some((p) => p.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = normalizePickupPass(payload.new);
            setPickupPasses((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setPickupPasses((prev) => prev.filter((p) => p.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(studentChannel);
      supabase.removeChannel(resultsChannel);
      supabase.removeChannel(receiptsChannel);
      supabase.removeChannel(feesChannel);
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(pickupPassesChannel);
    };
  }, [currentSchool?.id, currentUser?.school_id]);

  // Set current school and re-fetch tenant data
  const setCurrentSchoolById = useCallback((schoolId: string) => {
    const matched = schools.find((s) => s.id === schoolId);
    if (matched) {
      setCurrentSchool(matched);
      fetchLiveData(matched.id);
    }
  }, [schools, fetchLiveData]);

  // Student Fee Status Toggle (Admin can toggle "Mark School Fees as Paid" / "Pending")
  const toggleStudentFeeStatus = async (studentId: string, forceStatus?: boolean) => {
    let nextFeePaidState = false;

    const targetStudent = students.find((s) => s.id === studentId);
    if (!targetStudent) return;

    nextFeePaidState = forceStatus !== undefined ? forceStatus : !targetStudent.fee_paid;

    const updated = {
      ...targetStudent,
      fee_paid: nextFeePaidState,
      payment_status: nextFeePaidState ? ('paid' as const) : ('unpaid' as const),
      tuition_status: nextFeePaidState ? ('paid' as const) : ('pending' as const),
    };

    // Update in React state
    setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));

    // Synchronize corresponding invoices
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.student_id === studentId || inv.reg_number === targetStudent.reg_number) {
          return {
            ...inv,
            fee_paid: nextFeePaidState,
            status: nextFeePaidState ? 'paid' : 'pending',
            paid_amount: nextFeePaidState ? inv.total_amount : 0,
            paid_at: nextFeePaidState ? new Date().toISOString() : undefined,
          };
        }
        return inv;
      })
    );

    // Centralize write via secure server gateway, fallback to direct Supabase client
    void mutateTenantData({
      action: 'update',
      table: 'students',
      payload: {
        fee_paid: nextFeePaidState,
        payment_status: nextFeePaidState ? 'paid' : 'unpaid',
        tuition_status: nextFeePaidState ? 'paid' : 'pending',
      },
      filter: { id: studentId },
    });

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('students')
          .update({
            fee_paid: nextFeePaidState,
            payment_status: nextFeePaidState ? 'paid' : 'unpaid',
            tuition_status: nextFeePaidState ? 'paid' : 'pending',
          })
          .eq('id', studentId);
      } catch (err) {
        console.error('Error updating student fee status in Supabase:', err);
      }
    }
  };

  // Self-Service Register School Implementation
  const registerSchool = async (payload: RegisterSchoolPayload): Promise<{
    success: boolean;
    school?: School;
    inviteCode?: string;
    error?: string;
  }> => {
    try {
      // 1. First attempt reliable server-side registration route (bypasses RLS & enforces atomic schema consistency)
      try {
        const res = await fetch('/api/auth/register-school', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data?.success && data.school && data.staff) {
          const newSchool: School = data.school;
          const adminStaff: TeacherProfile = {
            id: data.staff.id,
            school_id: newSchool.id,
            teacher_id_code: data.staff.staff_id_code,
            full_name: data.staff.full_name,
            phone: data.staff.phone,
            email: data.staff.email,
            username: data.staff.username,
            password_hash: data.staff.password_hash,
            assigned_subject_ids: [],
            assigned_subjects: [],
            is_part_time: false,
            status: 'active',
            session_token: data.staff.session_token,
            created_at: data.staff.created_at,
          };

          const schoolClasses: AcademicClass[] = INITIAL_CLASSES.map((c) => ({
            ...c,
            id: `${newSchool.id}-${c.id}`,
            school_id: newSchool.id,
            student_count: 0,
          }));

          // Update local state
          setSchools((prev) => [newSchool, ...prev]);
          setCurrentSchool(newSchool);
          setClasses(schoolClasses);
          setStudents([]);
          setTeachers([adminStaff]);
          setResults([]);
          setReceipts([]);
          setFeeStructures([]);

          // If school is PENDING_APPROVAL, do NOT auto-login as active admin
          // Registration completed, ready for founder activation
          return {
            success: true,
            school: newSchool,
            inviteCode: newSchool.invite_code,
          };
        } else if (data?.message) {
          return { success: false, error: data.message };
        }
      } catch (serverErr) {
        console.warn('Server registration route note, proceeding to local/client flow:', serverErr);
      }

      return {
        success: false,
        error: 'Unable to connect to registration server. Please check your internet connection and try again.',
      };
    } catch (err: any) {
      console.error('Registration exception:', err);
      return { success: false, error: err?.message || 'Failed to register school' };
    }
  };

  // Student Login (Reg Number + PIN + Mandatory School Invite Code)
  const loginStudent = async (
    regNumber: string,
    pin: string,
    inviteCode: string
  ): Promise<{ success: boolean; message?: string; role?: UserRole }> => {
    const cleanReg = regNumber.trim().toUpperCase();
    const cleanPin = pin.trim();
    const cleanInvite = (inviteCode || '').trim().toUpperCase();

    if (!cleanInvite) {
      return {
        success: false,
        message: 'Please enter your School Invite Code (provided by your school administrator).',
      };
    }

    // Step 0: Try Server-Side Portal Login Endpoint (bypasses browser client quirks & RLS blocks)
    try {
      const apiRes = await fetch('/api/auth/portal-login', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        body: JSON.stringify({
          type: 'student',
          schoolCode: cleanInvite,
          regNumber: cleanReg,
          pin: cleanPin,
        }),
      });

      const payload = await apiRes.json().catch(() => null);

      if (apiRes.ok && payload) {
        if (payload.success && payload.student && payload.school) {
          const rawStudent = payload.student;
          const targetSchool: School = payload.school;
          const normalized = normalizeStudent(rawStudent);

          // Purge in-memory state of previous tenant
          purgeTenantState();

          setCurrentSchool(targetSchool);
          setSchools((prev) => (prev.some((s) => s.id === targetSchool.id) ? prev : [targetSchool, ...prev]));
          setStudents([normalized]);

          const authUser: AuthUser = {
            id: normalized.id,
            school_id: targetSchool.id,
            school_name: targetSchool.name,
            invite_code: targetSchool.invite_code,
            reg_number: normalized.reg_number,
            full_name: normalized.full_name,
            role: 'student',
            student_id: normalized.id,
            class_id: normalized.class_id,
            class_grade: normalized.class_grade,
            parent_phone: normalized.parent_phone,
          };

          setCurrentUser(authUser);
          setSessionCookie(authUser, targetSchool);

          // Non-blocking background hydration so student dashboard shell mounts instantaneously
          if (isSupabaseConfigured()) {
            void fetchLiveData(targetSchool.id);
          }

          return { success: true, role: 'student' as UserRole };
        } else if (payload.message) {
          return { success: false, message: payload.message };
        }
      } else if (payload && payload.message) {
        return { success: false, message: payload.message };
      }
    } catch (apiErr) {
      console.warn('Server portal login fallback to client check:', apiErr);
    }

    // Client fallback
    // Step 1: Strict Tenant Lookup First in public.schools
    let targetSchool = schools.find((s) => s.invite_code.toUpperCase() === cleanInvite) || null;
    if (!targetSchool && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .ilike('invite_code', cleanInvite)
          .maybeSingle();

        if (!error && data) {
          targetSchool = data as School;
          setSchools((prev) => (prev.some((s) => s.id === data.id) ? prev : [data as School, ...prev]));
        }
      } catch (schoolLookupErr) {
        console.warn('Error querying schools table for invite code:', schoolLookupErr);
      }
    }

    // If no matching school row is found, immediately abort before validating student
    if (!targetSchool) {
      return {
        success: false,
        message: 'Invalid School Invite Code. Check with your school administrator.',
      };
    }

    // Step 1b: Verify School Access Status (Skip master demo school)
    if (isSupabaseConfigured()) {
      try {
        const registryMap = await getSchoolAccessRegistry(supabase);
        const access = resolveSchoolAccess(targetSchool, registryMap);
        if (!access.canAccess) {
          setAccessGateBlocked(access.status);
          return {
            success: false,
            message: access.status === 'PENDING_APPROVAL'
              ? 'Awaiting Access Verification: Your institution’s 1-Term Free Pilot is awaiting Founder activation.'
              : 'Academic Term Concluded: Portal access for this academic term has concluded.',
          };
        }
      } catch {}
    }

    // Step 2: Set active tenant context and scope subsequent queries by that resolved school_id
    setCurrentSchool(targetSchool);

    let student = students.find((s) => {
      const matchReg = (s.reg_number || '').trim().toUpperCase() === cleanReg;
      const matchPin = (s.access_pin || '').trim() === cleanPin;
      const matchSchool = s.school_id === targetSchool!.id;
      return matchReg && matchPin && matchSchool;
    });

    // Fallback: Query Supabase students table strictly scoped by school_id
    if (!student && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('school_id', targetSchool.id)
          .ilike('reg_number', cleanReg)
          .eq('access_pin', cleanPin)
          .maybeSingle();

        if (!error && data) {
          student = normalizeStudent(data);
          setStudents((prev) => (prev.some((s) => s.id === student!.id) ? prev : [student!, ...prev]));
        }
      } catch (err) {
        console.warn('Direct student login query note:', err);
      }
    }

    if (!student) {
      return { success: false, message: 'Invalid registration number or PIN for this school.' };
    }

    const authUser: AuthUser = {
      id: student.id,
      school_id: targetSchool.id,
      school_name: targetSchool.name,
      invite_code: targetSchool.invite_code,
      reg_number: student.reg_number,
      full_name: student.full_name,
      role: 'student',
      student_id: student.id,
      class_id: student.class_id,
      class_grade: student.class_grade,
      parent_phone: student.parent_phone,
    };

    // Purge in-memory state of previous tenant
    purgeTenantState();
    setStudents([student]);

    setCurrentUser(authUser);
    setSessionCookie(authUser, targetSchool);

    // Non-blocking background hydration so student dashboard shell mounts instantaneously
    if (isSupabaseConfigured()) {
      void fetchLiveData(targetSchool.id);
    }

    return { success: true, role: 'student' as UserRole };
  };

  // Staff Login (Username + Password + Mandatory School Invite Code)
  const loginStaff = async (
    username: string,
    pass: string,
    inviteCode: string
  ): Promise<{ success: boolean; message?: string; role?: UserRole }> => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = pass.trim();
    const cleanInvite = (inviteCode || '').trim().toUpperCase();

    if (!cleanInvite) {
      return {
        success: false,
        message: 'Please enter your School Invite Code (provided by your school administrator).',
      };
    }

    // Step 0: Try Server-Side Portal Login Endpoint (bypasses browser client quirks & RLS blocks)
    try {
      const apiRes = await fetch('/api/auth/portal-login', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        body: JSON.stringify({
          type: 'staff',
          schoolCode: cleanInvite,
          identifier: cleanUser,
          password: cleanPass,
        }),
      });

      const payload = await apiRes.json().catch(() => null);

      if (apiRes.ok && payload) {
        if (payload.success && payload.staff && payload.school) {
          const rawStaff = payload.staff;
          const targetSchool: School = payload.school;
          const normalized = normalizeTeacher(rawStaff);

          // Purge in-memory state of previous tenant
          purgeTenantState();

          setCurrentSchool(targetSchool);
          setSchools((prev) => (prev.some((s) => s.id === targetSchool.id) ? prev : [targetSchool, ...prev]));
          setTeachers([normalized]);

          const rawRole = (rawStaff as any).role;
          const assignedRole: UserRole = payload.role || (
            rawRole === 'gate_security' || rawRole === 'GATE_SECURITY'
              ? 'gate_security'
              : rawRole === 'admin'
              ? 'admin'
              : 'teacher'
          );

          const authUser: AuthUser = {
            id: normalized.id,
            school_id: targetSchool.id,
            school_name: targetSchool.name,
            invite_code: targetSchool.invite_code,
            username: normalized.username,
            full_name: normalized.full_name,
            role: assignedRole,
            teacher_id: normalized.id,
            form_class_id: normalized.is_part_time ? undefined : normalized.form_class_id,
            assigned_class_id: normalized.assigned_class_id ?? (normalized.is_part_time ? null : (normalized.form_class_id ?? null)),
            form_class_name: normalized.is_part_time ? undefined : normalized.form_class_name,
            assigned_subject_ids: normalized.assigned_subject_ids,
            assigned_subjects: normalized.assigned_subjects || normalized.assigned_subject_ids,
            is_part_time: Boolean(normalized.is_part_time),
            session_token: normalized.session_token,
          };

          setCurrentUser(authUser);
          setSessionCookie(authUser, targetSchool);

          // Non-blocking background hydration so dashboard shell mounts instantaneously
          if (isSupabaseConfigured()) {
            void fetchLiveData(targetSchool.id);
          }

          return { success: true, role: assignedRole };
        } else if (payload.message) {
          return { success: false, message: payload.message };
        }
      } else if (payload && payload.message) {
        return { success: false, message: payload.message };
      }
    } catch (apiErr) {
      console.warn('Server portal login staff fallback to client check:', apiErr);
    }

    // Step 1: Strict Tenant Lookup First in public.schools
    let targetSchool = schools.find((s) => s.invite_code.toUpperCase() === cleanInvite) || null;
    if (!targetSchool && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .ilike('invite_code', cleanInvite)
          .maybeSingle();

        if (!error && data) {
          targetSchool = data as School;
          setSchools((prev) => (prev.some((s) => s.id === data.id) ? prev : [data as School, ...prev]));
        }
      } catch (schoolLookupErr) {
        console.warn('Error querying schools table for invite code:', schoolLookupErr);
      }
    }

    // If no matching school row is found, immediately abort before validating staff
    if (!targetSchool) {
      return {
        success: false,
        message: 'Invalid School Invite Code. Check with your school administrator.',
      };
    }

    // Step 1b: Verify School Access Status (Skip master demo school)
    if (isSupabaseConfigured()) {
      try {
        const registryMap = await getSchoolAccessRegistry(supabase);
        const access = resolveSchoolAccess(targetSchool, registryMap);
        if (!access.canAccess) {
          setAccessGateBlocked(access.status);
          return {
            success: false,
            message: access.status === 'PENDING_APPROVAL'
              ? 'Awaiting Access Verification: Your institution’s 1-Term Free Pilot is awaiting Founder activation.'
              : 'Academic Term Concluded: Portal access for this academic term has concluded.',
          };
        }
      } catch {}
    }

    // Step 2: Set active tenant context and scope subsequent queries by that resolved school_id
    setCurrentSchool(targetSchool);

    // Master Super-Admin check: valid only when paired with a verified registered school invite code
    if (cleanUser === 'admin' && (cleanPass === adminPassword || cleanPass === 'admin123' || cleanPass === 'admin')) {
      const authUser: AuthUser = {
        id: `usr-admin-${targetSchool.id.slice(0, 8)}`,
        school_id: targetSchool.id,
        school_name: targetSchool.name,
        invite_code: targetSchool.invite_code,
        username: 'admin',
        full_name: 'School Administrator',
        role: 'admin',
      };
      // Purge in-memory state of previous tenant
      purgeTenantState();

      setCurrentUser(authUser);
      setSessionCookie(authUser, targetSchool);

      // Non-blocking background hydration so admin dashboard shell mounts instantaneously
      if (isSupabaseConfigured()) {
        void fetchLiveData(targetSchool.id);
      }

      return { success: true, role: 'admin' as UserRole };
    }

    // Dynamic match against live Supabase-synchronized teacher / staff records scoped to targetSchool
    const normalizedCleanUser = cleanUser.replace(/\s+/g, '');
    let matchedTeacher = teachers.find((t) => {
      const matchSchool = t.school_id === targetSchool!.id;
      if (!matchSchool) return false;

      const matchUsername = (t.username || '').toLowerCase().replace(/\s+/g, '');
      const matchEmail = (t.email || '').toLowerCase().replace(/\s+/g, '');
      const matchIdCode = (t.teacher_id_code || '').toLowerCase().replace(/\s+/g, '');
      const matchUnderscored = matchIdCode.replace(/\//g, '_');
      const matchSlashed = matchUsername.replace(/_/g, '/');

      const matchesIdentifier =
        matchUsername === normalizedCleanUser ||
        matchEmail === normalizedCleanUser ||
        matchIdCode === normalizedCleanUser ||
        matchUnderscored === normalizedCleanUser ||
        matchSlashed === normalizedCleanUser;

      return matchesIdentifier && t.password_hash === cleanPass;
    });

    // Fallback: Query Supabase staff table directly scoped strictly to resolved school_id
    if (!matchedTeacher && isSupabaseConfigured()) {
      try {
        const slashedUser = cleanUser.includes('_') ? cleanUser.replace(/_/g, '/') : cleanUser;
        const underscoredUser = cleanUser.includes('/') ? cleanUser.replace(/\//g, '_') : cleanUser;
        const orFilter = [
          `username.ilike.${cleanUser}`,
          `email.ilike.${cleanUser}`,
          `staff_id_code.ilike.${cleanUser}`,
          slashedUser !== cleanUser ? `staff_id_code.ilike.${slashedUser}` : null,
          underscoredUser !== cleanUser ? `username.ilike.${underscoredUser}` : null,
        ].filter(Boolean).join(',');

        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('school_id', targetSchool.id)
          .or(orFilter)
          .eq('password_hash', cleanPass)
          .maybeSingle();

        if (!error && data) {
          matchedTeacher = normalizeTeacher(data);
          setTeachers((prev) => (prev.some((t) => t.id === matchedTeacher!.id) ? prev : [matchedTeacher!, ...prev]));
        }
      } catch (err) {
        console.warn('Direct staff login query note:', err);
      }
    }

    if (matchedTeacher) {
      if (matchedTeacher.status === 'revoked') {
        return { success: false, message: 'Invalid username or password.' };
      }

      // Determine role: staff row may have role 'admin', 'gate_security', or 'teacher'
      const rawRole = (matchedTeacher as any).role;
      const assignedRole: UserRole =
        rawRole === 'gate_security' || rawRole === 'GATE_SECURITY'
          ? 'gate_security'
          : rawRole === 'admin'
          ? 'admin'
          : 'teacher';

      const authUser: AuthUser = {
        id: matchedTeacher.id,
        school_id: targetSchool.id,
        school_name: targetSchool.name,
        invite_code: targetSchool.invite_code,
        username: matchedTeacher.username,
        full_name: matchedTeacher.full_name,
        role: assignedRole,
        teacher_id: matchedTeacher.id,
        form_class_id: matchedTeacher.is_part_time ? undefined : matchedTeacher.form_class_id,
        assigned_class_id: matchedTeacher.assigned_class_id ?? (matchedTeacher.is_part_time ? null : (matchedTeacher.form_class_id ?? null)),
        form_class_name: matchedTeacher.is_part_time ? undefined : matchedTeacher.form_class_name,
        assigned_subject_ids: matchedTeacher.assigned_subject_ids,
        assigned_subjects: matchedTeacher.assigned_subjects || matchedTeacher.assigned_subject_ids,
        is_part_time: Boolean(matchedTeacher.is_part_time),
        session_token: matchedTeacher.session_token,
      };
      // Purge in-memory state of previous tenant
      purgeTenantState();
      setTeachers([matchedTeacher]);

      setCurrentUser(authUser);
      setSessionCookie(authUser, targetSchool);

      // Non-blocking background hydration so dashboard shell mounts instantaneously
      if (isSupabaseConfigured()) {
        void fetchLiveData(targetSchool.id);
      }

      return { success: true, role: assignedRole };
    }

    return { success: false, message: 'Invalid username or password for this school.' };
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentSchool(DEFAULT_SCHOOL);
    setSessionCookie(null);
    purgeTenantState();
    if (typeof window !== 'undefined') {
      try {
        // Clear all session and localStorage keys starting with aegis_ or apex_
        const keysToClear = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('aegis_') || k.startsWith('apex_'))) keysToClear.push(k);
        }
        keysToClear.forEach((k) => localStorage.removeItem(k));

        const sessionKeys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && (k.startsWith('aegis_') || k.startsWith('apex_'))) sessionKeys.push(k);
        }
        sessionKeys.forEach((k) => sessionStorage.removeItem(k));

        // Explicitly remove cookies
        const isHttps = window.location.protocol === 'https:';
        const secureFlag = isHttps ? '; Secure' : '';
        document.cookie = `apex_auth_user=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
        document.cookie = `aegis_auth_school=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
      } catch {}
    }
  };

  // Teacher Score Entry Portal:
  // Automatically calculate Total Score (CA1 + CA2 + Exam) and assign letter grades
  const updateStudentScore = async (
    studentId: string,
    subjectId: string,
    classId: string,
    term: string,
    session: string,
    scores: { ca1: number; ca2: number; exam: number }
  ) => {
    const ca1 = Math.max(0, Math.min(20, Number(scores.ca1) || 0));
    const ca2 = Math.max(0, Math.min(20, Number(scores.ca2) || 0));
    const exam = Math.max(0, Math.min(60, Number(scores.exam) || 0));
    const total = ca1 + ca2 + exam;
    const { grade, remarks } = calculateGradeAndRemark(total);

    const existingIndex = results.findIndex(
      (r) =>
        r.student_id === studentId &&
        r.subject_id === subjectId &&
        r.class_id === classId &&
        r.term === term &&
        r.session === session
    );

    let updatedResultRecord: StudentResult;

    if (existingIndex >= 0) {
      updatedResultRecord = {
        ...results[existingIndex],
        ca1,
        ca2,
        exam,
        total_score: total,
        grade,
        remarks,
        graded_at: new Date().toISOString().split('T')[0],
        audited_by: currentUser?.full_name || currentUser?.username || 'Authorized Staff',
        audit_timestamp: new Date().toISOString(),
      };
      setResults((prev) => prev.map((r, i) => (i === existingIndex ? updatedResultRecord : r)));
    } else {
      const student = students.find((s) => s.id === studentId);
      const subject = subjects.find((sb) => sb.id === subjectId);
      updatedResultRecord = {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        student_id: studentId,
        student_name: student?.full_name || 'Student',
        reg_number: student?.reg_number || 'N/A',
        class_id: classId,
        subject_id: subjectId,
        subject_name: subject?.name || 'Subject',
        term,
        session,
        ca1,
        ca2,
        exam,
        total_score: total,
        grade,
        remarks,
        graded_at: new Date().toISOString().split('T')[0],
        audited_by: currentUser?.full_name || currentUser?.username || 'Authorized Staff',
        audit_timestamp: new Date().toISOString(),
      };
      setResults((prev) => [...prev, updatedResultRecord]);
    }

    // Persist score via secure tenant data gateway
    const dbSubjectId = toDbSubjectId(updatedResultRecord.subject_id);
    const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;
    const scorePayload = {
      student_id: updatedResultRecord.student_id,
      class_id: updatedResultRecord.class_id,
      subject_id: dbSubjectId,
      school_id: activeSchoolId,
      term: updatedResultRecord.term,
      session: updatedResultRecord.session,
      ca1: updatedResultRecord.ca1,
      ca2: updatedResultRecord.ca2,
      exam: updatedResultRecord.exam,
      grade: updatedResultRecord.grade,
      remarks: updatedResultRecord.remarks,
      audited_by: updatedResultRecord.audited_by,
      graded_at: updatedResultRecord.graded_at,
      audit_timestamp: updatedResultRecord.audit_timestamp,
    };

    const mutateRes = await mutateTenantData({
      action: 'upsert',
      table: 'term_results',
      payload: scorePayload,
    });

    if (!mutateRes.success) {
      console.warn('Tenant data gateway term_results upsert warning:', mutateRes.message);
    }
  };

  // Early Years Developmental Commentary Update
  const updateEarlyYearsCommentary = async (
    studentId: string,
    classId: string,
    term: string,
    session: string,
    commentary: EarlyYearsCommentary
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Find or create default Early Years subject
      const eySubjectId = 'subj-ec-lang';
      const student = students.find((s) => s.id === studentId);
      const subject = subjects.find((sb) => sb.id === eySubjectId) || subjects[0];
      const encodedRemarks = `EY_DATA:${JSON.stringify(commentary)}`;

      const existingIndex = results.findIndex(
        (r) =>
          r.student_id === studentId &&
          r.subject_id === eySubjectId &&
          r.term === term &&
          r.session === session
      );

      let updatedResult: StudentResult;
      const staffName = currentUser?.full_name || currentUser?.username || 'Form Teacher';
      const nowIso = new Date().toISOString();

      const commentaryWithMeta: EarlyYearsCommentary = {
        ...commentary,
        updated_at: nowIso,
        teacher_name: staffName,
      };

      if (existingIndex >= 0) {
        updatedResult = {
          ...results[existingIndex],
          remarks: encodedRemarks,
          early_years_data: commentaryWithMeta,
          audited_by: staffName,
          audit_timestamp: nowIso,
        };
        setResults((prev) => prev.map((r, i) => (i === existingIndex ? updatedResult : r)));
      } else {
        updatedResult = {
          id: `res-ey-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          student_id: studentId,
          student_name: student?.full_name || 'Pupil',
          reg_number: student?.reg_number || 'N/A',
          class_id: classId,
          subject_id: eySubjectId,
          subject_name: subject?.name || 'Early Years Development',
          term,
          session,
          ca1: 0,
          ca2: 0,
          exam: 0,
          total_score: 100, // Non-numeric rubric representation
          grade: 'A',
          remarks: encodedRemarks,
          early_years_data: commentaryWithMeta,
          graded_at: nowIso.split('T')[0],
          audited_by: staffName,
          audit_timestamp: nowIso,
        };
        setResults((prev) => [...prev, updatedResult]);
      }

      // Persist early years score via secure tenant data gateway
      const dbSubjectId = toDbSubjectId(updatedResult.subject_id);
      const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;
      const payload = {
        student_id: updatedResult.student_id,
        class_id: updatedResult.class_id,
        subject_id: dbSubjectId,
        school_id: activeSchoolId,
        term: updatedResult.term,
        session: updatedResult.session,
        ca1: 0,
        ca2: 0,
        exam: 0,
        grade: 'A',
        remarks: encodedRemarks,
        audited_by: updatedResult.audited_by,
        graded_at: updatedResult.graded_at,
        audit_timestamp: updatedResult.audit_timestamp,
      };

      await mutateTenantData({
        action: 'upsert',
        table: 'term_results',
        payload,
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed saving early years commentary.' };
    }
  };

  // Admin Class Management: Promote Class
  const promoteClass = (fromClassId: string, toClassId: string) => {
    const fromClass = classes.find((c) => c.id === fromClassId);
    const toClass = classes.find((c) => c.id === toClassId);

    if (!fromClass || !toClass) {
      return { success: false, count: 0, message: 'Invalid class selection.' };
    }

    const studentsToPromote = students.filter((s) => s.class_id === fromClassId);
    if (studentsToPromote.length === 0) {
      return {
        success: false,
        count: 0,
        message: `No students found currently enrolled in ${fromClass.name}.`,
      };
    }

    // Update students in state
    setStudents((prev) =>
      prev.map((s) => {
        if (s.class_id === fromClassId) {
          return {
            ...s,
            class_id: toClass.id,
            class_grade: toClass.name,
            session: toClass.session,
          };
        }
        return s;
      })
    );

    // Update classes in state
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id === fromClassId) {
          return { ...c, student_count: Math.max(0, c.student_count - studentsToPromote.length) };
        }
        if (c.id === toClassId) {
          return { ...c, student_count: c.student_count + studentsToPromote.length };
        }
        return c;
      })
    );

    // Update currentUser if active student was promoted
    if (currentUser?.class_id === fromClassId) {
      const updatedUser: AuthUser = {
        ...currentUser,
        class_id: toClass.id,
        class_grade: toClass.name,
      };
      setCurrentUser(updatedUser);
      setSessionCookie(updatedUser);
    }

    // Persist class promotion via secure tenant data gateway
    for (const s of studentsToPromote) {
      void mutateTenantData({
        action: 'update',
        table: 'students',
        payload: {
          class_id: toClass.id,
          class_grade: toClass.name,
          session: toClass.session,
        },
        filter: { id: s.id },
      });
    }

    addAnnouncement({
      title: `End-of-Session Class Promotion: ${fromClass.name} ➔ ${toClass.name}`,
      content: `${studentsToPromote.length} students have been promoted to ${toClass.name} for the ${toClass.session} session.`,
      author_name: 'School Administrator',
      priority: 'high',
    });

    return {
      success: true,
      count: studentsToPromote.length,
      message: `Successfully promoted ${studentsToPromote.length} students from ${fromClass.name} to ${toClass.name}!`,
    };
  };

  // Admin & Form Teacher Student Enrollment Generator
  const generateStudentProfile = async (data: {
    fullName: string;
    classId: string;
    classGrade: string;
    parentName: string;
    parentPhone: string;
    customRegNumber?: string;
    customPin?: string;
    enrolledByRole?: 'Bursar' | 'Principal' | 'Form Teacher';
    enrolledByName?: string;
    ndpaConsentGranted?: boolean;
    consentTimestamp?: string;
  }): Promise<{ success: boolean; student: StudentProfile; error?: string }> => {
    const nextSeq = Math.floor(100 + Math.random() * 900);
    const regNumber = data.customRegNumber?.trim().toUpperCase() || `STU-2026-${nextSeq}`;
    const accessPin = data.customPin?.trim() || `${Math.floor(1000 + Math.random() * 9000)}`;

    const determinedRole = data.enrolledByRole || (currentUser?.role === 'teacher' ? 'Form Teacher' : 'Bursar');
    const determinedName = data.enrolledByName || currentUser?.full_name || 'System Administrator';

    // Verify and resolve target class to ensure valid foreign key reference
    const matchedClass = classes.find((c) => c.id === data.classId) ||
      INITIAL_CLASSES.find((c) => c.id === data.classId) ||
      classes[0] ||
      INITIAL_CLASSES[0];

    const validClassId = matchedClass?.id || data.classId;
    const validClassGrade = matchedClass?.name || data.classGrade;

    const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;

    const newStudent: StudentProfile = {
      id: generateUUID(),
      school_id: activeSchoolId,
      reg_number: regNumber,
      access_pin: accessPin,
      full_name: data.fullName,
      class_id: validClassId,
      class_grade: validClassGrade,
      session: matchedClass?.session || '2025/2026',
      parent_name: data.parentName,
      parent_phone: data.parentPhone,
      gpa: 3.5,
      attendance_percentage: 100.0,
      fee_paid: false,
      payment_status: 'unpaid',
      tuition_status: 'pending',
      created_at: new Date().toISOString(),
      enrolled_by_role: determinedRole,
      enrolled_by_name: determinedName,
      enrollment_date: new Date().toISOString(),
      ndpa_consent_granted: data.ndpaConsentGranted !== undefined ? data.ndpaConsentGranted : true,
      consent_timestamp: data.consentTimestamp || new Date().toISOString(),
    };

    // Update in-memory state
    setStudents((prev) => [newStudent, ...prev]);

    setClasses((prev) =>
      prev.map((c) => (c.id === validClassId ? { ...c, student_count: c.student_count + 1 } : c))
    );

    const newInvoice: TuitionInvoice = {
      id: generateUUID(),
      student_id: newStudent.id,
      student_name: newStudent.full_name,
      reg_number: newStudent.reg_number,
      class_grade: newStudent.class_grade,
      invoice_number: `INV-2026-${nextSeq}`,
      term: '1st Term',
      due_date: '2025-11-15',
      total_amount: 245000.0,
      paid_amount: 0.0,
      fee_paid: false,
      status: 'pending',
      line_items: [
        { description: 'Term 1 Tuition & Academic Fee', amount: 180000.0 },
        { description: 'Registration & Identity Card', amount: 35000.0 },
        { description: 'Development & ICT Levy', amount: 30000.0 },
      ],
    };
    setInvoices((prev) => [newInvoice, ...prev]);

    // Persist new student via secure tenant data gateway
    const studentPayload = {
      id: newStudent.id,
      school_id: activeSchoolId,
      reg_number: newStudent.reg_number,
      access_pin: newStudent.access_pin,
      full_name: newStudent.full_name,
      class_id: newStudent.class_id,
      class_grade: newStudent.class_grade,
      session: newStudent.session,
      parent_name: newStudent.parent_name,
      parent_phone: newStudent.parent_phone,
      gpa: newStudent.gpa,
      attendance_percentage: newStudent.attendance_percentage,
      fee_paid: newStudent.fee_paid,
      payment_status: newStudent.payment_status,
      enrolled_by_role: newStudent.enrolled_by_role,
      enrolled_by_name: newStudent.enrolled_by_name,
      enrollment_date: newStudent.enrollment_date,
      ndpa_consent_granted: newStudent.ndpa_consent_granted,
      consent_timestamp: newStudent.consent_timestamp,
      created_at: newStudent.created_at,
    };

    const res = await mutateTenantData({
      action: 'insert',
      table: 'students',
      payload: studentPayload,
    });

    if (!res.success) {
      console.warn('Tenant data gateway student insert notice:', res.message);
    }

    return {
      success: true,
      student: newStudent,
    };
  };

  const payInvoiceStub = (invoiceId: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: 'paid', paid_amount: inv.total_amount, paid_at: new Date().toISOString() }
          : inv
      )
    );
    const matched = invoices.find((inv) => inv.id === invoiceId);
    if (matched) {
      setStudents((prev) =>
        prev.map((s) => (s.id === matched.student_id ? { ...s, tuition_status: 'paid' as const } : s))
      );
    }
  };

  const addAnnouncement = (item: Omit<SchoolAnnouncement, 'id' | 'published_at'>) => {
    const newAnn: SchoolAnnouncement = {
      ...item,
      id: `ann-${Date.now()}`,
      published_at: new Date().toISOString().split('T')[0],
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
  };

  // Fee Structure Builder
  const publishFeeStructure = async (
    data: Omit<FeeStructure, 'id' | 'published' | 'published_at'>
  ): Promise<{ success: boolean; structure: FeeStructure; error?: string }> => {
    // Check if an existing fee structure matches class_id, term, and session to preserve ID or update
    const existing = feeStructures.find(
      (f) => f.class_id === data.class_id && f.term === data.term && f.session === data.session
    );

    const targetId = existing?.id && existing.id.includes('-') && existing.id.length === 36
      ? existing.id
      : generateUUID();

    const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;

    const newStructure: FeeStructure = {
      ...data,
      id: targetId,
      school_id: activeSchoolId,
      published: true,
      published_at: new Date().toISOString().split('T')[0],
    };

    setFeeStructures((prev) => {
      const filtered = prev.filter(
        (f) => !(f.class_id === data.class_id && f.term === data.term && f.session === data.session)
      );
      return [newStructure, ...filtered];
    });

    // Persist fee structure via secure tenant data gateway
    const payload = {
      id: newStructure.id,
      school_id: activeSchoolId,
      class_id: newStructure.class_id,
      class_name: newStructure.class_name,
      term: newStructure.term,
      session: newStructure.session,
      line_items: newStructure.line_items,
      total_amount: newStructure.total_amount,
      published: newStructure.published,
      published_at: newStructure.published_at,
    };

    const res = await mutateTenantData({
      action: 'upsert',
      table: 'fee_structures',
      payload,
    });

    if (!res.success) {
      console.warn('Tenant data gateway fee structure publish notice:', res.message);
    }

    return { success: true, structure: newStructure };
  };

  const updateFeeStructure = (id: string, updates: Partial<FeeStructure>) => {
    setFeeStructures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const deleteFeeStructure = async (id: string): Promise<{ success: boolean; error?: string }> => {
    setFeeStructures((prev) => prev.filter((f) => f.id !== id));
    await mutateTenantData({
      action: 'delete',
      table: 'fee_structures',
      filter: { id },
    });
    return { success: true };
  };

  // Receipt Upload & Verification & Debt Ledger
  const getStudentTermLedger = (studentId: string, term: string) => {
    const student = students.find((s) => s.id === studentId);
    const feeStructure =
      feeStructures.find((fs) => fs.class_id === student?.class_id && fs.term === term && fs.published) ||
      feeStructures.find((fs) => fs.class_id === student?.class_id && fs.published);

    const termInvoice = invoices.find(
      (inv) => inv.student_id === studentId && (inv.term === term || (!inv.term && term === '1st Term'))
    );

    const totalTermFee = feeStructure ? feeStructure.total_amount : termInvoice?.total_amount || 235000;

    const studentTx = transactions.filter(
      (tx) => tx.student_id === studentId && tx.term === term
    );

    let totalPaid = studentTx.reduce((sum, tx) => sum + tx.amount_credited, 0);

    const studentReceipts = receipts.filter(
      (r) => (r.student_id === studentId || r.reg_number === student?.reg_number) && (r.term === term || !r.term)
    );
    const hasApprovedReceipt = studentReceipts.some((r) => r.status === 'approved');
    const isExplicitlyPaid =
      termInvoice?.fee_paid ||
      termInvoice?.status === 'paid' ||
      (term === '1st Term' && (student?.fee_paid || student?.payment_status === 'paid'));

    if (totalPaid === 0 && (hasApprovedReceipt || isExplicitlyPaid)) {
      totalPaid = totalTermFee;
    }

    const remainingBalance = Math.max(0, totalTermFee - totalPaid);
    const hasPendingVerification = studentReceipts.some((r) => r.status === 'pending_verification');

    let paymentStatus: 'unpaid' | 'pending_verification' | 'partially_paid' | 'paid' = 'unpaid';
    if (remainingBalance === 0 && totalPaid >= totalTermFee) {
      paymentStatus = 'paid';
    } else if (hasPendingVerification) {
      paymentStatus = 'pending_verification';
    } else if (totalPaid > 0 && remainingBalance > 0) {
      paymentStatus = 'partially_paid';
    } else {
      paymentStatus = 'unpaid';
    }

    const isUnlocked = remainingBalance === 0;

    return {
      totalTermFee,
      totalPaid,
      remainingBalance,
      paymentStatus,
      isUnlocked,
    };
  };

  const uploadReceipt = async (
    studentId: string,
    data: {
      fileName: string;
      fileDataUrl: string;
      amountClaimed: number;
      paymentMode?: 'full' | 'partial';
      feeStructureId?: string;
      term?: string;
      session?: string;
      fileType?: string;
      storagePath?: string;
    }
  ): Promise<{ success: boolean; receipt?: PaymentReceipt; error?: string }> => {
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    const receiptTerm = data.term || '1st Term';
    const receiptSession = data.session || SCHOOL_INFO.session || '2025/2026';
    const receiptUUID = generateUUID();
    const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;

    const newReceipt: PaymentReceipt = {
      id: receiptUUID,
      school_id: activeSchoolId,
      student_id: studentId,
      student_name: student.full_name,
      reg_number: student.reg_number,
      class_grade: student.class_grade,
      class_id: student.class_id,
      term: receiptTerm,
      session: receiptSession,
      fee_structure_id: data.feeStructureId,
      amount_claimed: data.amountClaimed,
      payment_mode: data.paymentMode || 'full',
      file_name: data.fileName,
      file_data_url: data.fileDataUrl,
      file_type: data.fileType,
      storage_path: data.storagePath,
      uploaded_at: new Date().toISOString(),
      status: 'pending_verification',
    };

    setReceipts((prev) => [newReceipt, ...prev]);

    // Mark student status as pending_verification
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              payment_status: 'pending_verification' as const,
              fee_paid: false,
              tuition_status: 'pending' as const,
            }
          : s
      )
    );

    // Update corresponding invoice to pending
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.student_id === studentId && (inv.term === receiptTerm || !inv.term)
          ? { ...inv, status: 'pending' as const, fee_paid: false }
          : inv
      )
    );

    // Persist receipt to Supabase (packing student & class metadata safely inside admin_note so fresh sessions never show N/A)
    if (isSupabaseConfigured()) {
      try {
        const metadataTag = `AEGIS_RECEIPT_META:${JSON.stringify({
          student_name: student.full_name,
          admission_no: student.reg_number,
          class_name: student.class_grade,
        })}`;

        const payload = {
          id: newReceipt.id,
          school_id: activeSchoolId,
          student_id: newReceipt.student_id,
          class_id: newReceipt.class_id,
          fee_structure_id: newReceipt.fee_structure_id || null,
          term: newReceipt.term,
          session: newReceipt.session,
          amount_claimed: newReceipt.amount_claimed,
          payment_mode: newReceipt.payment_mode,
          file_name: newReceipt.file_name,
          file_data_url: newReceipt.file_data_url,
          storage_path: newReceipt.storage_path || null,
          file_type: newReceipt.file_type || 'application/pdf',
          status: newReceipt.status,
          uploaded_at: newReceipt.uploaded_at,
          admin_note: metadataTag,
        };

        // Persist via secure tenant data gateway
        void mutateTenantData({
          action: 'insert',
          table: 'receipts',
          payload,
        });

        return { success: true, receipt: newReceipt };
      } catch (err: any) {
        console.warn('Receipt insert exception:', err);
        return { success: true, receipt: newReceipt };
      }
    }

    return { success: true, receipt: newReceipt };
  };

  const approveReceipt = async (receiptId: string) => {
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!receipt) return;

    const receiptTerm = receipt.term || '1st Term';
    const receiptSession = receipt.session || SCHOOL_INFO.session || '2025/2026';

    const feeStructure =
      feeStructures.find((fs) => fs.class_id === receipt.class_id && fs.term === receiptTerm && fs.published) ||
      feeStructures.find((fs) => fs.class_id === receipt.class_id && fs.published);
    const totalTermFee = feeStructure ? feeStructure.total_amount : 235000;

    const priorPaid = transactions
      .filter((tx) => tx.student_id === receipt.student_id && tx.term === receiptTerm)
      .reduce((sum, tx) => sum + tx.amount_credited, 0);

    const creditAmount = Math.max(0, totalTermFee - priorPaid > 0 ? totalTermFee - priorPaid : receipt.amount_claimed);

    setReceipts((prev) =>
      prev.map((r) =>
        r.id === receiptId
          ? {
              ...r,
              status: 'approved' as ReceiptStatus,
              amount_approved: creditAmount,
              reviewed_by: 'Bursar Admin',
              reviewed_at: new Date().toISOString(),
            }
          : r
      )
    );

    const newTx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      receipt_id: receiptId,
      student_id: receipt.student_id,
      student_name: receipt.student_name,
      reg_number: receipt.reg_number,
      class_grade: receipt.class_grade,
      term: receiptTerm,
      session: receiptSession,
      amount_credited: creditAmount,
      payment_type: 'full',
      remaining_debt: 0,
      total_term_fee: totalTermFee,
      transaction_date: new Date().toISOString(),
      verified_by: 'Bursar Admin',
      note: 'Verified in full by Bursar. Results slip unlocked.',
    };

    setTransactions((prev) => [newTx, ...prev]);

    setStudents((prev) =>
      prev.map((s) =>
        s.id === receipt.student_id
          ? {
              ...s,
              payment_status: 'paid' as const,
              fee_paid: true,
              tuition_status: 'paid' as const,
            }
          : s
      )
    );

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.student_id === receipt.student_id && (inv.term === receiptTerm || !inv.term)
          ? {
              ...inv,
              fee_paid: true,
              status: 'paid' as const,
              paid_amount: totalTermFee,
              paid_at: new Date().toISOString(),
            }
          : inv
      )
    );

    // Persist approval via secure tenant data gateway
    void mutateTenantData({
      action: 'update',
      table: 'receipts',
      payload: {
        status: 'approved',
        amount_approved: creditAmount,
        reviewed_by: currentUser?.id && currentUser.id.length === 36 ? currentUser.id : null,
        reviewed_at: new Date().toISOString(),
      },
      filter: { id: receiptId },
    });

    void mutateTenantData({
      action: 'update',
      table: 'students',
      payload: {
        fee_paid: true,
        payment_status: 'paid',
        tuition_status: 'paid',
      },
      filter: { id: receipt.student_id },
    });
  };

  const confirmPartialPayment = async (receiptId: string, approvedAmount?: number, bursarNote?: string) => {
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!receipt) return;

    const receiptTerm = receipt.term || '1st Term';
    const receiptSession = receipt.session || SCHOOL_INFO.session || '2025/2026';

    const feeStructure =
      feeStructures.find((fs) => fs.class_id === receipt.class_id && fs.term === receiptTerm && fs.published) ||
      feeStructures.find((fs) => fs.class_id === receipt.class_id && fs.published);
    const totalTermFee = feeStructure ? feeStructure.total_amount : 235000;

    const creditAmount = approvedAmount !== undefined ? approvedAmount : receipt.amount_claimed;

    const priorPaid = transactions
      .filter((tx) => tx.student_id === receipt.student_id && tx.term === receiptTerm)
      .reduce((sum, tx) => sum + tx.amount_credited, 0);

    const newTotalPaid = priorPaid + creditAmount;
    const newRemainingDebt = Math.max(0, totalTermFee - newTotalPaid);
    const isFullyPaidNow = newRemainingDebt === 0;

    setReceipts((prev) =>
      prev.map((r) =>
        r.id === receiptId
          ? {
              ...r,
              status: (isFullyPaidNow ? 'approved' : 'partially_approved') as ReceiptStatus,
              amount_approved: creditAmount,
              reviewed_by: 'Bursar Admin',
              reviewed_at: new Date().toISOString(),
              admin_note: bursarNote || `Partial payment of ${creditAmount} credited. Remaining: ${newRemainingDebt}`,
            }
          : r
      )
    );

    const newTx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      receipt_id: receiptId,
      student_id: receipt.student_id,
      student_name: receipt.student_name,
      reg_number: receipt.reg_number,
      class_grade: receipt.class_grade,
      term: receiptTerm,
      session: receiptSession,
      amount_credited: creditAmount,
      payment_type: isFullyPaidNow ? 'full' : 'partial',
      remaining_debt: newRemainingDebt,
      total_term_fee: totalTermFee,
      transaction_date: new Date().toISOString(),
      verified_by: 'Bursar Admin',
      note: bursarNote || `Partial deposit credited. Remaining debt: ₦${newRemainingDebt.toLocaleString()}`,
    };

    setTransactions((prev) => [newTx, ...prev]);

    setStudents((prev) =>
      prev.map((s) =>
        s.id === receipt.student_id
          ? {
              ...s,
              payment_status: isFullyPaidNow ? ('paid' as const) : ('partially_paid' as const),
              fee_paid: isFullyPaidNow,
              tuition_status: isFullyPaidNow ? ('paid' as const) : ('partial' as const),
            }
          : s
      )
    );

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.student_id === receipt.student_id && (inv.term === receiptTerm || !inv.term)
          ? {
              ...inv,
              fee_paid: isFullyPaidNow,
              status: isFullyPaidNow ? ('paid' as const) : ('partial' as const),
              paid_amount: newTotalPaid,
              paid_at: isFullyPaidNow ? new Date().toISOString() : inv.paid_at,
            }
          : inv
      )
    );

    // Persist partial payment via secure tenant data gateway
    void mutateTenantData({
      action: 'update',
      table: 'receipts',
      payload: {
        status: isFullyPaidNow ? 'approved' : 'partially_approved',
        amount_approved: creditAmount,
        reviewed_by: currentUser?.id && currentUser.id.length === 36 ? currentUser.id : null,
        reviewed_at: new Date().toISOString(),
        admin_note: bursarNote,
      },
      filter: { id: receiptId },
    });

    void mutateTenantData({
      action: 'update',
      table: 'students',
      payload: {
        fee_paid: isFullyPaidNow,
        payment_status: isFullyPaidNow ? 'paid' : 'partially_paid',
        tuition_status: isFullyPaidNow ? 'paid' : 'partial',
      },
      filter: { id: receipt.student_id },
    });
  };

  const rejectReceipt = async (receiptId: string, note?: string) => {
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!receipt) return;

    const receiptTerm = receipt.term || '1st Term';

    setReceipts((prev) =>
      prev.map((r) =>
        r.id === receiptId
          ? {
              ...r,
              status: 'rejected' as ReceiptStatus,
              reviewed_by: 'Bursar Admin',
              reviewed_at: new Date().toISOString(),
              admin_note: note || 'Proof of payment rejected. Please review and re-upload valid bank transfer receipt.',
            }
          : r
      )
    );

    const priorPaid = transactions
      .filter((tx) => tx.student_id === receipt.student_id && tx.term === receiptTerm)
      .reduce((sum, tx) => sum + tx.amount_credited, 0);

    const hasPriorDeposit = priorPaid > 0;

    setStudents((prev) =>
      prev.map((s) =>
        s.id === receipt.student_id
          ? {
              ...s,
              payment_status: hasPriorDeposit ? ('partially_paid' as const) : ('unpaid' as const),
              fee_paid: false,
              tuition_status: hasPriorDeposit ? ('partial' as const) : ('pending' as const),
            }
          : s
      )
    );

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.student_id === receipt.student_id && (inv.term === receiptTerm || !inv.term)
          ? { ...inv, fee_paid: false, status: hasPriorDeposit ? ('partial' as const) : ('pending' as const) }
          : inv
      )
    );

    // Persist rejection via secure tenant data gateway
    void mutateTenantData({
      action: 'update',
      table: 'receipts',
      payload: {
        status: 'rejected',
        reviewed_by: currentUser?.id && currentUser.id.length === 36 ? currentUser.id : null,
        reviewed_at: new Date().toISOString(),
        admin_note: note,
      },
      filter: { id: receiptId },
    });
  };

  // Teacher Registry & Security Controls (Admin)
  const registerTeacher = (data: {
    fullName: string;
    phone: string;
    email: string;
    role?: StaffRole;
    assignedSubjectIds: string[];
    assignedSubjects?: string[];
    formClassId?: string;
    assignedClassId?: string | null;
    isPartTime?: boolean;
  }) => {
    const isSecurity = data.role === 'gate_security';
    const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;
    const activeInvite = (currentSchool?.invite_code || currentUser?.invite_code || 'AEGIS-2026').toUpperCase();
    const inviteSuffix = activeInvite.includes('-') ? activeInvite.split('-')[1] : activeInvite.slice(-4);

    const nextSeq = String(teachers.length + 1).padStart(3, '0');
    const teacherIdCode = isSecurity
      ? `SEC-${inviteSuffix}-${nextSeq}`
      : `TCH/2026/${nextSeq}`;
    const generatedPassword = isSecurity
      ? `Gate${Math.floor(1000 + Math.random() * 9000)}!`
      : `Tch${Math.floor(1000 + Math.random() * 9000)}!`;
    const resolvedSubjectIds = isSecurity ? [] : (data.assignedSubjects || data.assignedSubjectIds || []);
    const isPartTime = isSecurity ? true : Boolean(data.isPartTime);
    const assignedClassId = isSecurity || isPartTime ? null : (data.assignedClassId ?? data.formClassId ?? null);
    const formClass = !isPartTime && !isSecurity && assignedClassId ? classes.find((c) => c.id === assignedClassId) : undefined;
    const newStaffUuid = generateUUID();

    const newTeacher: TeacherProfile = {
      id: newStaffUuid,
      school_id: activeSchoolId,
      teacher_id_code: teacherIdCode,
      full_name: data.fullName,
      phone: data.phone,
      email: data.email,
      username: teacherIdCode.toLowerCase().replace(/[\/-]/g, '_'),
      password_hash: generatedPassword,
      role: data.role || 'teacher',
      assigned_subject_ids: resolvedSubjectIds,
      assigned_subjects: resolvedSubjectIds,
      form_class_id: isPartTime || isSecurity ? undefined : (assignedClassId || undefined),
      assigned_class_id: assignedClassId,
      form_class_name: isPartTime || isSecurity ? undefined : formClass?.name,
      is_part_time: isPartTime,
      status: 'active',
      session_token: generateUUID(),
      created_at: new Date().toISOString(),
    };

    setTeachers((prev) => [newTeacher, ...prev]);

    if (!isPartTime && !isSecurity && assignedClassId) {
      setClasses((prev) =>
        prev.map((c) => (c.id === assignedClassId ? { ...c, class_teacher: data.fullName } : c))
      );
    }

    // Persist staff creation via secure tenant data gateway
    hashPassword(generatedPassword)
      .then((hashedPass) => {
        const staffPayload = {
          id: newTeacher.id,
          school_id: activeSchoolId,
          staff_id_code: newTeacher.teacher_id_code,
          full_name: newTeacher.full_name,
          phone: newTeacher.phone,
          email: newTeacher.email,
          username: newTeacher.username,
          password_hash: hashedPass,
          role: newTeacher.role || 'teacher',
          status: newTeacher.status,
          assigned_subject_ids: newTeacher.assigned_subject_ids,
          form_class_id: newTeacher.form_class_id || null,
          session_token: newTeacher.session_token,
        };

        return mutateTenantData({
          action: 'insert',
          table: 'staff',
          payload: staffPayload,
        });
      })
      .then((res: any) => {
        if (!res?.success) {
          console.warn('Tenant data gateway staff insert notice:', res?.message);
        } else {
          console.log('✓ Successfully saved new staff member via tenant gateway:', newTeacher.teacher_id_code);
        }
      })
      .catch((e: unknown) => console.error('Staff insert exception:', e));

    return { teacher: newTeacher, initialPassword: generatedPassword };
  };

  const updateTeacher = (
    teacherId: string,
    updates: {
      fullName?: string;
      phone?: string;
      email?: string;
      role?: StaffRole;
      assignedSubjectIds?: string[];
      assignedSubjects?: string[];
      formClassId?: string;
      assignedClassId?: string | null;
      isPartTime?: boolean;
      resetCredentials?: boolean;
    }
  ) => {
    let newPassword: string | undefined = undefined;
    const newToken = generateUUID();

    setTeachers((prev) =>
      prev.map((t) => {
        if (t.id === teacherId) {
          if (updates.resetCredentials) {
            newPassword = t.role === 'gate_security'
              ? `Gate${Math.floor(1000 + Math.random() * 9000)}#`
              : `Reset${Math.floor(1000 + Math.random() * 9000)}#`;
          }

          const resolvedRole = updates.role !== undefined ? updates.role : (t.role || 'teacher');
          const isSecurity = resolvedRole === 'gate_security';
          const isPartTime = isSecurity ? true : (updates.isPartTime !== undefined ? Boolean(updates.isPartTime) : Boolean(t.is_part_time));
          const resolvedSubjectIds = isSecurity ? [] : (updates.assignedSubjects !== undefined
            ? updates.assignedSubjects
            : (updates.assignedSubjectIds !== undefined ? updates.assignedSubjectIds : t.assigned_subject_ids));

          let targetClassId: string | null = null;
          if (!isPartTime && !isSecurity) {
            targetClassId = updates.assignedClassId !== undefined ? updates.assignedClassId : (updates.formClassId || t.form_class_id || null);
          }

          const targetClass = targetClassId ? classes.find((c) => c.id === targetClassId) : undefined;

          return {
            ...t,
            full_name: updates.fullName || t.full_name,
            phone: updates.phone || t.phone,
            email: updates.email || t.email,
            role: resolvedRole,
            assigned_subject_ids: resolvedSubjectIds,
            assigned_subjects: resolvedSubjectIds,
            form_class_id: targetClassId || undefined,
            assigned_class_id: targetClassId,
            form_class_name: targetClass?.name,
            is_part_time: isPartTime,
            password_hash: newPassword || t.password_hash,
            session_token: updates.resetCredentials ? newToken : t.session_token,
            last_credential_reset: updates.resetCredentials ? new Date().toISOString() : t.last_credential_reset,
          };
        }
        return t;
      })
    );

    const dbUpdates: any = {};
    if (updates.fullName) dbUpdates.full_name = updates.fullName;
    if (updates.phone) dbUpdates.phone = updates.phone;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.assignedSubjects !== undefined || updates.assignedSubjectIds !== undefined) {
      dbUpdates.assigned_subject_ids = updates.role === 'gate_security' ? [] : (updates.assignedSubjects || updates.assignedSubjectIds);
    }
    if (updates.role === 'gate_security' || updates.isPartTime) {
      dbUpdates.form_class_id = null;
    } else if (updates.formClassId !== undefined || updates.assignedClassId !== undefined) {
      dbUpdates.form_class_id = updates.assignedClassId || updates.formClassId || null;
    }

    const syncStaffUpdate = async () => {
      if (newPassword) {
        const hashed = await hashPassword(newPassword);
        dbUpdates.password_hash = hashed;
        dbUpdates.session_token = newToken;
      }
      const res = await mutateTenantData({
        action: 'update',
        table: 'staff',
        payload: dbUpdates,
        filter: { id: teacherId },
      });
      if (!res.success) console.warn('Tenant data gateway staff update notice:', res.message);
    };

    syncStaffUpdate().catch((e: unknown) => console.error('Staff update exception:', e));

    return { success: true, newPassword };
  };

  const deleteTeacher = (teacherId: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    void mutateTenantData({
      action: 'delete',
      table: 'staff',
      filter: { id: teacherId },
    });
    if (currentUser?.teacher_id === teacherId) {
      logout();
    }
  };

  // Phase 3: School Geofence Update (Admin)
  const updateSchoolGeofence = async (params: {
    latitude: number;
    longitude: number;
    geofenceRadiusMeters?: number;
    resumptionCutoffTime?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!currentSchool) {
      return { success: false, error: 'No active school selected' };
    }

    const updatedSchool: School = {
      ...currentSchool,
      latitude: Number(params.latitude),
      longitude: Number(params.longitude),
      geofence_radius_meters: params.geofenceRadiusMeters ?? currentSchool.geofence_radius_meters ?? 150,
      resumption_cutoff_time: params.resumptionCutoffTime ?? currentSchool.resumption_cutoff_time ?? '08:00',
    };

    setCurrentSchool(updatedSchool);
    setSchools((prev) => prev.map((s) => (s.id === updatedSchool.id ? updatedSchool : s)));

    void mutateTenantData({
      action: 'update',
      table: 'schools',
      payload: {
        latitude: updatedSchool.latitude,
        longitude: updatedSchool.longitude,
        geofence_radius_meters: updatedSchool.geofence_radius_meters,
      },
      filter: { id: updatedSchool.id },
    });

    return { success: true };
  };

  // White-Label School Crest / Logo Update (Admin)
  const updateSchoolLogo = async (logoUrl: string | null): Promise<{ success: boolean; error?: string }> => {
    if (!currentSchool) {
      return { success: false, error: 'No active school selected.' };
    }

    const updatedSchool: School = {
      ...currentSchool,
      logo_url: logoUrl,
      logoUrl: logoUrl,
    };

    setCurrentSchool(updatedSchool);
    setSchools((prev) => prev.map((s) => (s.id === updatedSchool.id ? updatedSchool : s)));
    setSessionCookie(currentUser, updatedSchool);

    void mutateTenantData({
      action: 'update',
      table: 'schools',
      payload: { logo_url: logoUrl },
      filter: { id: updatedSchool.id },
    });

    return { success: true };
  };

  // Official Fee Payment Bank Account Update (Admin)
  const updateSchoolBankDetails = async (
    bankName: string,
    accountNumber: string,
    accountName: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentSchool) {
      return { success: false, error: 'No active school selected.' };
    }

    const cleanBank = (bankName || '').trim();
    const cleanNum = (accountNumber || '').trim();
    const cleanName = (accountName || '').trim();

    if (cleanNum && !/^\d{10}$/.test(cleanNum)) {
      return { success: false, error: 'Account number must be a valid 10-digit NUBAN number.' };
    }

    const updatedSchool: School = {
      ...currentSchool,
      bank_name: cleanBank || null,
      bankName: cleanBank || null,
      account_number: cleanNum || null,
      accountNumber: cleanNum || null,
      account_name: cleanName || null,
      accountName: cleanName || null,
    };

    setCurrentSchool(updatedSchool);
    setSchools((prev) => prev.map((s) => (s.id === updatedSchool.id ? updatedSchool : s)));
    setSessionCookie(currentUser, updatedSchool);

    void mutateTenantData({
      action: 'update',
      table: 'schools',
      payload: {
        bank_name: cleanBank || null,
        account_number: cleanNum || null,
        account_name: cleanName || null,
      },
      filter: { id: updatedSchool.id },
    });

    return { success: true };
  };

  // Phase 3: Geofenced Staff Clock-In
  const clockInStaff = async (params: {
    scannedPayload: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{ success: boolean; record?: StaffAttendance; message?: string; distanceMeters?: number }> => {
    if (!currentUser || currentUser.role !== 'teacher') {
      return { success: false, message: 'Only authenticated faculty/teachers can clock in.' };
    }

    const activeSchoolId = (currentSchool?.id || currentUser.school_id || DEFAULT_SCHOOL.id).trim().toLowerCase();
    const activeInviteCode = (currentSchool?.invite_code || currentUser.invite_code || '').trim().toUpperCase();

    // 1. Validate Scanned QR Code
    // Support formats: `AEGIS_ATTENDANCE:<schoolId>` or `AEGIS_ATTENDANCE:<schoolId>:<inviteCode>`
    const rawPayload = params.scannedPayload.trim();
    let isValidCode = false;

    if (rawPayload.startsWith('AEGIS_ATTENDANCE:')) {
      const parts = rawPayload.split(':');
      const scannedId = (parts[1] || '').trim().toLowerCase();
      const scannedInvite = (parts[2] || '').trim().toUpperCase();

      if (scannedId === activeSchoolId) {
        isValidCode = true;
      } else if (activeInviteCode && scannedInvite === activeInviteCode) {
        isValidCode = true;
      } else if (scannedId === activeInviteCode.toLowerCase()) {
        isValidCode = true;
      }
    }

    if (!isValidCode) {
      return {
        success: false,
        message: 'Invalid Gate QR Code. Please scan the official QR poster for your school.',
      };
    }

    // 2. Prevent duplicate clock-in on same calendar day
    const todayIsoDate = new Date().toISOString().split('T')[0];
    const existingToday = staffAttendance.find((att) => {
      const isSameTeacher = att.teacher_id === (currentUser.teacher_id || currentUser.id);
      const isSameDay = att.check_in_time.startsWith(todayIsoDate);
      return isSameTeacher && isSameDay;
    });

    if (existingToday) {
      return {
        success: false,
        message: `You have already clocked in today at ${new Date(existingToday.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        record: existingToday,
      };
    }

    // 3. Geofence Verification using Haversine formula
    let distanceMeters: number | null = null;
    const schoolLat = currentSchool?.latitude;
    const schoolLon = currentSchool?.longitude;
    const radiusMeters = currentSchool?.geofence_radius_meters || 150;

    if (schoolLat !== null && schoolLat !== undefined && schoolLon !== null && schoolLon !== undefined) {
      if (params.latitude !== undefined && params.longitude !== undefined) {
        distanceMeters = calculateHaversineDistance(
          schoolLat,
          schoolLon,
          params.latitude,
          params.longitude
        );

        if (distanceMeters > radiusMeters) {
          return {
            success: false,
            message: `You are ${distanceMeters}m away from school. Move within ${radiusMeters}m of the school gate/staffroom to clock in.`,
            distanceMeters,
          };
        }
      } else {
        // Teacher physically scanned the authentic gate QR poster, but browser/device GPS is restricted or unavailable
        distanceMeters = null;
      }
    }

    // 4. Punctuality Evaluation
    const now = new Date();
    const cutoffTime = currentSchool?.resumption_cutoff_time || '08:00';
    const isLate = isLateCheckIn(now, cutoffTime);
    const status = isLate ? 'LATE' : 'PRESENT';

    const newRecord: StaffAttendance = {
      id: generateUUID(),
      school_id: activeSchoolId,
      teacher_id: currentUser.teacher_id || currentUser.id,
      teacher_name: currentUser.full_name || 'Teacher',
      check_in_time: now.toISOString(),
      clock_out_time: null,
      status,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      distance_meters: distanceMeters,
      created_at: now.toISOString(),
    };

    setStaffAttendance((prev) => [newRecord, ...prev]);

    const attPayload = {
      id: newRecord.id,
      school_id: newRecord.school_id,
      teacher_id: newRecord.teacher_id,
      teacher_name: newRecord.teacher_name,
      check_in_time: newRecord.check_in_time,
      status: newRecord.status,
      latitude: newRecord.latitude,
      longitude: newRecord.longitude,
      distance_meters: newRecord.distance_meters,
      created_at: newRecord.created_at,
    };

    // Persist via secure tenant data gateway
    void mutateTenantData({
      action: 'insert',
      table: 'staff_attendance',
      payload: attPayload,
    });



    return {
      success: true,
      record: newRecord,
      message: `Clock-in recorded (${status === 'LATE' ? 'Late Arrival' : 'Present - On Time'}). ${distanceMeters !== null ? `Distance: ${distanceMeters}m.` : 'QR Verified (GPS Unavailable).'}`.trim(),
      distanceMeters: distanceMeters ?? undefined,
    };
  };

  // Phase 3: Staff Clock-Out Action
  const clockOutStaff = async (attendanceId: string): Promise<{ success: boolean; message?: string }> => {
    const nowIso = new Date().toISOString();

    setStaffAttendance((prev) =>
      prev.map((a) => (a.id === attendanceId ? { ...a, clock_out_time: nowIso } : a))
    );

    // Persist via secure tenant data gateway
    void mutateTenantData({
      action: 'update',
      table: 'staff_attendance',
      payload: { clock_out_time: nowIso },
      filter: { id: attendanceId },
    });

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('staff_attendance')
          .update({ clock_out_time: nowIso })
          .eq('id', attendanceId);
      } catch (err: any) {
        console.warn('Supabase clock-out update note:', err);
      }
    }

    return { success: true, message: 'Clock-out time saved successfully.' };
  };

  // Helper: Generate collision-free 6-digit numeric OTP for active school
  const generateUniqueOtpCode = (schoolId: string): string => {
    let code = '';
    let attempts = 0;
    while (attempts < 50) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const collision = pickupPasses.some(
        (p) => p.school_id === schoolId && p.status === 'ACTIVE' && p.otp_code === code
      );
      if (!collision) break;
      attempts++;
    }
    return code;
  };

  // Phase 4: Generate Daily Parent Pick-Up Pass (Expires at 23:59:59 today)
  const generateDailyParentPass = async (studentId: string): Promise<{ success: boolean; pass?: PickupPass; error?: string }> => {
    try {
      const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;
      const todayIso = new Date().toISOString().split('T')[0];

      // Check if an ACTIVE daily parent pass already exists today for this student
      const existing = pickupPasses.find(
        (p) =>
          p.school_id === activeSchoolId &&
          p.student_id === studentId &&
          p.pass_type === 'DAILY_PARENT' &&
          p.status === 'ACTIVE' &&
          new Date(p.expires_at) > new Date()
      );

      if (existing) {
        return { success: true, pass: existing };
      }

      // Expire at today's end (23:59:59)
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const otp = generateUniqueOtpCode(activeSchoolId);
      const token = `pkt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const newPass: PickupPass = {
        id: generateUUID(),
        school_id: activeSchoolId,
        student_id: studentId,
        pass_type: 'DAILY_PARENT',
        delegate_name: null,
        otp_code: otp,
        qr_token: token,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        expires_at: endOfToday.toISOString(),
        picked_up_at: null,
        verified_by_staff_id: null,
      };

      setPickupPasses((prev) => [newPass, ...prev.filter((p) => !(p.student_id === studentId && p.pass_type === 'DAILY_PARENT' && p.status === 'ACTIVE'))]);

      const passPayload = {
        id: newPass.id,
        school_id: newPass.school_id,
        student_id: newPass.student_id,
        pass_type: newPass.pass_type,
        delegate_name: newPass.delegate_name,
        otp_code: newPass.otp_code,
        qr_token: newPass.qr_token,
        status: newPass.status,
        created_at: newPass.created_at,
        expires_at: newPass.expires_at,
      };

      // Persist via secure tenant data gateway
      void mutateTenantData({
        action: 'insert',
        table: 'pickup_passes',
        payload: passPayload,
      });



      return { success: true, pass: newPass };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed generating daily parent pass.' };
    }
  };

  // Phase 4: Generate 5-Hour Expiring Delegate Pick-Up Pass
  const generateDelegatePass = async (studentId: string, delegateName: string): Promise<{ success: boolean; pass?: PickupPass; error?: string }> => {
    try {
      if (!delegateName.trim()) {
        return { success: false, error: 'Delegate full name is required.' };
      }

      const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;
      const now = new Date();
      // Strictly created_at + 5 hours
      const expiresAt = new Date(now.getTime() + 5 * 3600 * 1000);

      const otp = generateUniqueOtpCode(activeSchoolId);
      const token = `pkt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const newPass: PickupPass = {
        id: generateUUID(),
        school_id: activeSchoolId,
        student_id: studentId,
        pass_type: 'DELEGATE_5H',
        delegate_name: delegateName.trim(),
        otp_code: otp,
        qr_token: token,
        status: 'ACTIVE',
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        picked_up_at: null,
        verified_by_staff_id: null,
      };

      setPickupPasses((prev) => [newPass, ...prev]);

      const delegatePayload = {
        id: newPass.id,
        school_id: newPass.school_id,
        student_id: newPass.student_id,
        pass_type: newPass.pass_type,
        delegate_name: newPass.delegate_name,
        otp_code: newPass.otp_code,
        qr_token: newPass.qr_token,
        status: newPass.status,
        created_at: newPass.created_at,
        expires_at: newPass.expires_at,
      };

      // Persist via secure tenant data gateway
      void mutateTenantData({
        action: 'insert',
        table: 'pickup_passes',
        payload: delegatePayload,
      });



      return { success: true, pass: newPass };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed generating delegate pass.' };
    }
  };

  // Phase 4: Revoke Pick-Up Pass (Parent cancellation)
  const revokePickupPass = async (passId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setPickupPasses((prev) =>
        prev.map((p) => (p.id === passId ? { ...p, status: 'EXPIRED' } : p))
      );

      // Persist revocation via secure tenant data gateway
      void mutateTenantData({
        action: 'update',
        table: 'pickup_passes',
        payload: { status: 'EXPIRED' },
        filter: { id: passId },
      });

      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('pickup_passes')
            .update({ status: 'EXPIRED' })
            .eq('id', passId);
        } catch (err: any) {
          console.warn('Supabase revoke pickup pass exception:', err);
        }
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed revoking pass.' };
    }
  };

  // Phase 4: Staff Gate Verification & Handover Confirmation
  const verifyAndHandoverPass = async (params: {
    codeOrToken: string;
    verifiedByStaffId?: string;
  }): Promise<{
    success: boolean;
    pass?: PickupPass;
    student?: StudentProfile;
    error?: string;
    reason?: 'EXPIRED' | 'USED' | 'INVALID' | 'WRONG_SCHOOL';
  }> => {
    try {
      const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;
      let raw = params.codeOrToken.trim();

      // Normalize structured QR payload or full URL:
      // Formats:
      // 1. AEGIS_PICKUP:${school_id}:${otp_code}
      // 2. /pickup-pass/[qr_token] or https://.../pickup-pass/[qr_token]
      // 3. raw 6-digit OTP code
      // 4. raw qr_token
      let targetOtp: string | null = null;
      let targetToken: string | null = null;

      if (raw.startsWith('AEGIS_PICKUP:')) {
        const parts = raw.split(':');
        // parts[0] = AEGIS_PICKUP, parts[1] = schoolId, parts[2] = otp
        if (parts.length >= 3) {
          const payloadSchool = parts[1];
          if (payloadSchool && payloadSchool !== activeSchoolId) {
            return {
              success: false,
              reason: 'WRONG_SCHOOL',
              error: 'This pass belongs to a different school.',
            };
          }
          targetOtp = parts[2].trim();
        }
      } else if (raw.includes('/pickup-pass/')) {
        const parts = raw.split('/pickup-pass/');
        targetToken = parts[1]?.split(/[?#/]/)[0]?.trim() || null;
      } else if (/^\d{6}$/.test(raw)) {
        targetOtp = raw;
      } else {
        targetToken = raw;
      }

      // Try resolving pass from local state first
      let matchedPass = pickupPasses.find((p) => {
        if (p.school_id !== activeSchoolId) return false;
        if (targetOtp && p.otp_code === targetOtp) return true;
        if (targetToken && p.qr_token === targetToken) return true;
        return false;
      }) || null;

      // If not in local memory, query dedicated pickup-pass server API
      if (!matchedPass && targetToken) {
        try {
          const res = await fetch(`/api/pickup-pass?token=${encodeURIComponent(targetToken)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.pass && data.pass.school_id === activeSchoolId) {
              matchedPass = normalizePickupPass(data.pass);
            }
          }
        } catch (apiErr) {
          console.warn('Pickup pass API lookup note:', apiErr);
        }
      }

      if (!matchedPass) {
        return {
          success: false,
          reason: 'INVALID',
          error: 'Invalid Pick-Up Code or QR Token. No matching pass found for this school.',
        };
      }

      if (matchedPass.status === 'USED' || matchedPass.status === 'RELEASED_AT_GATE') {
        return {
          success: false,
          reason: 'USED',
          pass: matchedPass,
          error: `Code Already Used / Released at ${matchedPass.gate_released_at || matchedPass.picked_up_at ? new Date(matchedPass.gate_released_at || matchedPass.picked_up_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier today'}.`,
        };
      }

      const now = new Date();
      if (matchedPass.status === 'EXPIRED' || now > new Date(matchedPass.expires_at)) {
        return {
          success: false,
          reason: 'EXPIRED',
          pass: matchedPass,
          error: 'Pass Expired. This pick-up authorization has lapsed.',
        };
      }

      // Resolve student details
      let student = students.find((s) => s.id === matchedPass!.student_id);
      if (!student && isSupabaseConfigured()) {
        try {
          const { data: stdData } = await supabase
            .from('students')
            .select('*')
            .eq('id', matchedPass.student_id)
            .maybeSingle();
          if (stdData) {
            student = normalizeStudent(stdData);
          }
        } catch {}
      }

      // Mark pass as USED
      const nowIso = now.toISOString();
      const staffId = params.verifiedByStaffId || currentUser?.id || null;

      const updatedPass: PickupPass = {
        ...matchedPass,
        status: 'USED',
        picked_up_at: nowIso,
        verified_by_staff_id: staffId,
      };

      setPickupPasses((prev) => prev.map((p) => (p.id === updatedPass.id ? updatedPass : p)));

      // Persist status change via secure tenant data gateway
      void mutateTenantData({
        action: 'update',
        table: 'pickup_passes',
        payload: {
          status: 'USED',
          picked_up_at: nowIso,
          verified_by_staff_id: staffId,
        },
        filter: { id: updatedPass.id },
      });

      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('pickup_passes')
            .update({
              status: 'USED',
              picked_up_at: nowIso,
              verified_by_staff_id: staffId,
            })
            .eq('id', updatedPass.id);
        } catch (err: any) {
          console.warn('Supabase mark pass as used exception:', err);
        }
      }

      return {
        success: true,
        pass: updatedPass,
        student,
      };
    } catch (err: any) {
      return {
        success: false,
        reason: 'INVALID',
        error: err?.message || 'Verification process encountered an error.',
      };
    }
  };

  // Phase 4b: Gate Security - 1-Tap Confirm Gate Release
  const confirmGateRelease = async (params: {
    passId: string;
    securityStaffId?: string;
    securityStaffName?: string;
  }): Promise<{
    success: boolean;
    pass?: PickupPass;
    error?: string;
  }> => {
    try {
      const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;
      const targetPass = pickupPasses.find((p) => p.id === params.passId && p.school_id === activeSchoolId);

      const nowIso = new Date().toISOString();
      const securityId = params.securityStaffId || currentUser?.id || null;

      const updatedPass: PickupPass = targetPass
        ? {
            ...targetPass,
            status: 'RELEASED_AT_GATE',
            picked_up_at: targetPass.picked_up_at || nowIso,
            gate_released_at: nowIso,
            released_by_security_id: securityId,
          }
        : {
            id: params.passId,
            school_id: activeSchoolId,
            student_id: '',
            pass_type: 'DAILY_PARENT',
            otp_code: '000000',
            qr_token: '',
            status: 'RELEASED_AT_GATE',
            created_at: nowIso,
            expires_at: nowIso,
            picked_up_at: nowIso,
            gate_released_at: nowIso,
            released_by_security_id: securityId,
          };

      setPickupPasses((prev) =>
        prev.some((p) => p.id === params.passId)
          ? prev.map((p) => (p.id === params.passId ? updatedPass : p))
          : [updatedPass, ...prev]
      );

      // Persist gate release via secure tenant data gateway
      void mutateTenantData({
        action: 'update',
        table: 'pickup_passes',
        payload: {
          status: 'RELEASED_AT_GATE',
          picked_up_at: updatedPass.picked_up_at,
          gate_released_at: nowIso,
          released_by_security_id: securityId,
        },
        filter: { id: params.passId },
      });

      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('pickup_passes')
            .update({
              status: 'RELEASED_AT_GATE',
              picked_up_at: updatedPass.picked_up_at,
              gate_released_at: nowIso,
              released_by_security_id: securityId,
            })
            .eq('id', params.passId);
        } catch (dbErr: any) {
          console.warn('Supabase confirmGateRelease error:', dbErr);
        }
      }

      return {
        success: true,
        pass: updatedPass,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to confirm gate release.',
      };
    }
  };

  // Phase 5: Mark Class Empty & Reopen Dismissal Engine
  const markClassEmpty = async (params: {
    classId: string;
    className: string;
    teacherId: string;
    teacherName: string;
  }): Promise<{
    success: boolean;
    audit?: ClassDismissalAudit;
    unverifiedCount: number;
    unverifiedStudents: { id: string; name: string }[];
    error?: string;
  }> => {
    try {
      const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;
      const todayDate = new Date().toISOString().split('T')[0];

      // 1. Get all students in this class and school
      const targetClass = classes.find((c) => c.id === params.classId || c.name === params.className);
      const classStudents = students.filter((s) => {
        if (s.school_id && s.school_id !== activeSchoolId) return false;
        return s.class_id === params.classId || s.class_grade === params.className || (targetClass && (s.class_id === targetClass.id || s.class_grade === targetClass.name));
      });

      // 2. Identify students with verified Safe Pick-Up today
      const verifiedStudentIds = new Set(
        pickupPasses
          .filter((p) => p.status === 'USED' && p.picked_up_at && p.picked_up_at.startsWith(todayDate))
          .map((p) => p.student_id)
      );

      // 3. Any student without a verified pickup pass today is flagged LEFT_WITHOUT_SAFE_PICKUP
      const unverified = classStudents.filter((s) => !verifiedStudentIds.has(s.id));
      const unverifiedIds = unverified.map((s) => s.id);
      const unverifiedNames = unverified.map((s) => s.full_name);

      const auditRecord: ClassDismissalAudit = {
        id: generateUUID(),
        school_id: activeSchoolId,
        class_id: params.classId,
        class_name: params.className,
        date: todayDate,
        marked_empty_at: new Date().toISOString(),
        marked_by_teacher_id: params.teacherId,
        marked_by_teacher_name: params.teacherName,
        is_reopened: false,
        reopened_at: null,
        unverified_student_ids: unverifiedIds,
        unverified_student_names: unverifiedNames,
      };

      setClassDismissals((prev) => {
        const filtered = prev.filter(
          (a) => !(a.class_id === params.classId && a.date === todayDate)
        );
        const updated = [auditRecord, ...filtered];
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('aegis_class_dismissals', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });

      // Optional: Post an automated high-priority system notice if students left without safe pickup
      if (unverified.length > 0) {
        const alertAnnouncement: SchoolAnnouncement = {
          id: generateUUID(),
          school_id: activeSchoolId,
          title: `⚠️ Unverified Dismissal Alert: ${params.className}`,
          content: `${unverified.length} student(s) (${unverifiedNames.join(', ')}) in ${params.className} left without verified Safe Pick-Up on ${todayDate}. Dismissal audit logged by ${params.teacherName}.`,
          author_name: params.teacherName,
          priority: 'high',
          published_at: new Date().toISOString(),
        };
        setAnnouncements((prev) => [alertAnnouncement, ...prev]);
      }

      return {
        success: true,
        audit: auditRecord,
        unverifiedCount: unverified.length,
        unverifiedStudents: unverified.map((s) => ({ id: s.id, name: s.full_name })),
      };
    } catch (err: any) {
      return {
        success: false,
        unverifiedCount: 0,
        unverifiedStudents: [],
        error: err?.message || 'Failed to complete class dismissal audit.',
      };
    }
  };

  const reopenClassDismissal = async (classId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      setClassDismissals((prev) => {
        const updated = prev.map((a) => {
          if (a.class_id === classId && a.date === todayDate) {
            return {
              ...a,
              is_reopened: true,
              reopened_at: new Date().toISOString(),
            };
          }
          return a;
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('aegis_class_dismissals', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to reopen class dismissal.' };
    }
  };

  const contextValue = React.useMemo(
    () => ({
      schoolInfo: SCHOOL_INFO,
      currentSchool,
      schools,
      currentUser,
      currentRole: currentUser?.role || null,
      isAuthenticated: !!currentUser,
      isAuthReady,
      classes,
      subjects,
      allocations,
      results,
      students,
      invoices,
      announcements,
      staffAttendance,
      pickupPasses,
      classDismissals,
      registerSchool,
      setCurrentSchoolById,
      loginStudent,
      loginStaff,
      logout,
      updateStudentScore,
      promoteClass,
      generateStudentProfile,
      payInvoiceStub,
      addAnnouncement,
      toggleStudentFeeStatus,
      feeStructures,
      publishFeeStructure,
      updateFeeStructure,
      deleteFeeStructure,
      receipts,
      transactions,
      uploadReceipt,
      approveReceipt,
      confirmPartialPayment,
      rejectReceipt,
      getStudentTermLedger,
      teachers,
      registerTeacher,
      updateTeacher,
      deleteTeacher,
      theme,
      toggleTheme,
      resultsPublished,
      toggleResultsPublished,
      updateAdminPassword,
      updateSchoolLogo,
      updateSchoolBankDetails,
      updateSchoolGeofence,
      clockInStaff,
      clockOutStaff,
      updateEarlyYearsCommentary,
      generateDailyParentPass,
      generateDelegatePass,
      revokePickupPass,
      verifyAndHandoverPass,
      confirmGateRelease,
      markClassEmpty,
      reopenClassDismissal,
    }),
    [
      currentSchool,
      schools,
      currentUser,
      isAuthReady,
      classes,
      subjects,
      allocations,
      results,
      students,
      invoices,
      announcements,
      staffAttendance,
      pickupPasses,
      classDismissals,
      feeStructures,
      receipts,
      transactions,
      teachers,
      theme,
      resultsPublished,
      adminPassword,
      registerSchool,
      setCurrentSchoolById,
      updateSchoolLogo,
      updateSchoolBankDetails,
      updateSchoolGeofence,
      clockInStaff,
      clockOutStaff,
      updateEarlyYearsCommentary,
      generateDailyParentPass,
      generateDelegatePass,
      revokePickupPass,
      verifyAndHandoverPass,
      confirmGateRelease,
      markClassEmpty,
      reopenClassDismissal,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      {accessGateBlocked && currentSchool && (
        <AccessGateModal
          status={accessGateBlocked}
          schoolName={currentSchool.name}
          inviteCode={currentSchool.invite_code}
          onSignOut={() => {
            setAccessGateBlocked(null);
            logout();
          }}
        />
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
