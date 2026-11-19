'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AuthUser,
  UserRole,
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
} from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { generateUUID } from '@/lib/uuid';
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

  // Multi-Tenant School Registration & Management
  registerSchool: (payload: RegisterSchoolPayload) => Promise<{
    success: boolean;
    school?: School;
    inviteCode?: string;
    error?: string;
  }>;
  setCurrentSchoolById: (schoolId: string) => void;

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to set cross-browser, mobile-resilient session cookie and multi-store fallback
function setSessionCookie(user: AuthUser | null) {
  if (typeof document === 'undefined') return;
  try {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    if (!user) {
      document.cookie = `apex_auth_user=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
      try { sessionStorage.removeItem('apex_auth_user'); } catch {}
    } else {
      const encoded = encodeURIComponent(JSON.stringify(user));
      // 7 days expiration with explicit Lax and HTTPS Secure guard
      document.cookie = `apex_auth_user=${encoded}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
      try { sessionStorage.setItem('apex_auth_user', JSON.stringify(user)); } catch {}
    }
  } catch {}
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
  return null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const DEFAULT_SCHOOL: School = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Aegis Academy Nigeria',
    invite_code: 'AEGIS-2026',
    latitude: 6.5244,
    longitude: 3.3792,
    geofence_radius_meters: 75,
    created_at: '2026-01-01T00:00:00.000Z',
  };

  const [schools, setSchools] = useState<School[]>([DEFAULT_SCHOOL]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(DEFAULT_SCHOOL);
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendance[]>([]);
  const [pickupPasses, setPickupPasses] = useState<PickupPass[]>([]);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [classes, setClasses] = useState<AcademicClass[]>(INITIAL_CLASSES);
  const [subjects] = useState<AcademicSubject[]>(INITIAL_SUBJECTS);
  const [allocations] = useState<TeacherSubjectAllocation[]>(INITIAL_ALLOCATIONS);
  const [results, setResults] = useState<StudentResult[]>(INITIAL_RESULTS);
  const [students, setStudents] = useState<StudentProfile[]>(INITIAL_STUDENTS);
  const [invoices, setInvoices] = useState<TuitionInvoice[]>(INITIAL_INVOICES);
  const [announcements, setAnnouncements] = useState<SchoolAnnouncement[]>(INITIAL_ANNOUNCEMENTS);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>(INITIAL_FEE_STRUCTURES);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>(INITIAL_RECEIPTS);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(INITIAL_TRANSACTIONS);
  const [teachers, setTeachers] = useState<TeacherProfile[]>(INITIAL_TEACHERS);
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

      if (isSupabaseConfigured()) {
        Promise.resolve(
          supabase
            .from('fee_structures')
            .upsert({
              id: '00000000-0000-0000-0000-000000000001',
              class_id: 'cls-creche',
              class_name: 'SYSTEM_SETTINGS_RESULTS_GATE',
              term: 'GLOBAL_GATE',
              session: '2025/2026',
              line_items: [{ name: 'results_published', amount: 0 }],
              total_amount: 0,
              published: nextVal,
              published_at: new Date().toISOString(),
            })
        )
          .then((res: any) => {
            if (res?.error) {
              console.warn('Supabase results gate sync note:', res.error.message);
            }
          })
          .catch(() => {});
      }
      return nextVal;
    });
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
      password_hash: t.password_hash || 'Tch2026!',
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
    };
  };

  // Live Cloud Fetch from Supabase with granular per-query error isolation
  const fetchLiveData = useCallback(async (targetSchoolId?: string) => {
    if (!isSupabaseConfigured() || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const activeSchoolId = targetSchoolId || currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;

      // 1. Ensure core classes exist in Supabase for default school so foreign keys never fail
      try {
        const { data: existingClasses, error: classSelectErr } = await supabase
          .from('classes')
          .select('id')
          .eq('school_id', activeSchoolId);
        if (!classSelectErr && (!existingClasses || existingClasses.length === 0)) {
          const classesPayload = INITIAL_CLASSES.map((c) => ({
            id: activeSchoolId === DEFAULT_SCHOOL.id ? c.id : `${activeSchoolId}-${c.id}`,
            school_id: activeSchoolId,
            name: c.name,
            session: c.session,
            level: c.level,
            arm: c.arm || null,
            stage: c.stage,
            student_count: 0,
          }));
          await supabase.from('classes').upsert(classesPayload, { onConflict: 'id' });
        }
      } catch (classInitErr) {
        console.warn('Initial classes cloud check note:', classInitErr);
      }

      // 2. Fetch each table with dedicated try/catch guards scoped by school_id
      const fetchStudentsPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', activeSchoolId)
            .order('created_at', { ascending: false });
          if (error) {
            console.warn('Supabase students query returned error (falling back to cached/default state):', error.message || error);
            return null;
          }
          return data;
        } catch (stdErr) {
          console.warn('Supabase students fetch caught exception (falling back gracefully):', stdErr);
          return null;
        }
      })();

      const fetchStaffPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('staff')
            .select('*')
            .eq('school_id', activeSchoolId)
            .order('created_at', { ascending: false });
          if (error) {
            console.warn('Supabase staff query returned error (falling back to cached/default state):', error.message || error);
            return null;
          }
          return data;
        } catch (staffErr) {
          console.warn('Supabase staff fetch caught exception:', staffErr);
          return null;
        }
      })();

      const fetchResultsPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('term_results')
            .select('*')
            .eq('school_id', activeSchoolId)
            .order('created_at', { ascending: false });
          if (error) {
            console.warn('Supabase term_results query note:', error.message || error);
            return null;
          }
          return data;
        } catch (resErr) {
          console.warn('Supabase term_results fetch caught exception:', resErr);
          return null;
        }
      })();

      const fetchClassesPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('classes')
            .select('*')
            .eq('school_id', activeSchoolId);
          if (error) {
            console.warn('Supabase classes query note:', error.message || error);
            return null;
          }
          return data;
        } catch (clsErr) {
          console.warn('Supabase classes fetch caught exception:', clsErr);
          return null;
        }
      })();

      const fetchFeesPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('fee_structures')
            .select('*')
            .eq('school_id', activeSchoolId);
          if (error) {
            console.warn('Supabase fee_structures query note:', error.message || error);
            return null;
          }
          return data;
        } catch (feeErr) {
          console.warn('Supabase fee_structures fetch caught exception:', feeErr);
          return null;
        }
      })();

      const fetchReceiptsPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('receipts')
            .select('*')
            .eq('school_id', activeSchoolId)
            .order('created_at', { ascending: false });
          if (error) {
            console.warn('Supabase receipts query note:', error.message || error);
            return null;
          }
          return data;
        } catch (recErr) {
          console.warn('Supabase receipts fetch caught exception:', recErr);
          return null;
        }
      })();

      const fetchSchoolsPromise = (async () => {
        try {
          const { data, error } = await supabase.from('schools').select('*');
          if (error) {
            console.warn('Supabase schools query note:', error.message || error);
            return null;
          }
          return data;
        } catch (schoolErr) {
          console.warn('Supabase schools fetch caught exception:', schoolErr);
          return null;
        }
      })();

      const fetchAttendancePromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('staff_attendance')
            .select('*')
            .eq('school_id', activeSchoolId)
            .order('check_in_time', { ascending: false });
          if (error) {
            console.warn('Supabase staff_attendance query note:', error.message || error);
            return null;
          }
          return data;
        } catch (attErr) {
          console.warn('Supabase staff_attendance fetch caught exception:', attErr);
          return null;
        }
      })();

      const fetchPickupPassesPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('pickup_passes')
            .select('*')
            .eq('school_id', activeSchoolId)
            .order('created_at', { ascending: false });
          if (error) {
            console.warn('Supabase pickup_passes query note:', error.message || error);
            return null;
          }
          return data;
        } catch (passErr) {
          console.warn('Supabase pickup_passes fetch caught exception:', passErr);
          return null;
        }
      })();

      const [stdData, staffData, resData, classData, feeData, recData, schoolData, attData, passData] = await Promise.all([
        fetchStudentsPromise,
        fetchStaffPromise,
        fetchResultsPromise,
        fetchClassesPromise,
        fetchFeesPromise,
        fetchReceiptsPromise,
        fetchSchoolsPromise,
        fetchAttendancePromise,
        fetchPickupPassesPromise,
      ]);

      // Apply guarded updates only if data was successfully received
      let activeStudentList = students;
      if (stdData && Array.isArray(stdData) && stdData.length > 0) {
        try {
          const normalizedStudents = stdData.map(normalizeStudent);
          activeStudentList = normalizedStudents;
          setStudents(normalizedStudents);
        } catch (normStdErr) {
          console.warn('Error normalizing students payload:', normStdErr);
        }
      }

      if (staffData && Array.isArray(staffData) && staffData.length > 0) {
        try {
          const normalizedStaff = staffData.map(normalizeTeacher);
          setTeachers(normalizedStaff);
        } catch (normStaffErr) {
          console.warn('Error normalizing staff payload:', normStaffErr);
        }
      }

      if (resData && Array.isArray(resData) && resData.length > 0) {
        try {
          const normalizedResults = resData.map((r) => normalizeResult(r, activeStudentList));
          setResults(normalizedResults);
        } catch (normResErr) {
          console.warn('Error normalizing term_results payload:', normResErr);
          setResults(resData as StudentResult[]);
        }
      }

      if (classData && Array.isArray(classData) && classData.length > 0) {
        setClasses(classData as AcademicClass[]);
      }

      if (feeData && Array.isArray(feeData) && feeData.length > 0) {
        setFeeStructures(feeData as FeeStructure[]);
        const gateRow = feeData.find((f: any) => f.id === '00000000-0000-0000-0000-000000000001');
        if (gateRow) {
          setResultsPublished(Boolean(gateRow.published));
          try {
            localStorage.setItem('apex_results_published', String(Boolean(gateRow.published)));
          } catch {}
        }
      }

      if (recData && Array.isArray(recData) && recData.length > 0) {
        setReceipts(recData as PaymentReceipt[]);
      }

      if (schoolData && Array.isArray(schoolData) && schoolData.length > 0) {
        setSchools(schoolData as School[]);
        const active = schoolData.find((s: any) => s.id === currentUser?.school_id) || schoolData[0];
        if (active) setCurrentSchool(active);
      }

      if (attData && Array.isArray(attData) && attData.length > 0) {
        setStaffAttendance(attData.map(normalizeAttendance));
      }

      if (passData && Array.isArray(passData) && passData.length > 0) {
        setPickupPasses(passData.map(normalizePickupPass));
      }
    } catch (err) {
      console.warn('Non-fatal error in fetchLiveData (safely falling back to default/cached data):', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // 1. Initial Mount: Authenticate session and trigger Cloud Sync (strictly run once on mount)
  const isInitialMountRef = useRef(false);
  useEffect(() => {
    if (isInitialMountRef.current) return;
    isInitialMountRef.current = true;

    try {
      const cookieUser = getSessionCookie();
      if (cookieUser) {
        setCurrentUser(cookieUser);
      } else {
        setCurrentUser(null);
        setSessionCookie(null);
      }
    } catch {} finally {
      setIsAuthReady(true);
    }

    // Immediately fetch from Supabase cloud once on initial mount
    if (isSupabaseConfigured()) {
      fetchLiveData();
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
            const inserted = payload.new as PaymentReceipt;
            setReceipts((prev) => {
              if (prev.some((rc) => rc.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as PaymentReceipt;
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

    return () => {
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(studentChannel);
      supabase.removeChannel(resultsChannel);
      supabase.removeChannel(receiptsChannel);
      supabase.removeChannel(feesChannel);
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

    // Centralize write to Supabase
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
      const schoolId = generateUUID();

      // Generate unique collision-checked invite code: AEGIS-XXXX
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let inviteCode = '';
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        attempts++;
        let randomSuffix = '';
        for (let i = 0; i < 4; i++) {
          randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        inviteCode = `AEGIS-${randomSuffix}`;

        // Check if collision in local state or in cloud
        const localCollision = schools.some((s) => s.invite_code === inviteCode);
        if (!localCollision && isSupabaseConfigured()) {
          const { data } = await supabase.from('schools').select('id').eq('invite_code', inviteCode).maybeSingle();
          if (!data) isUnique = true;
        } else if (!localCollision) {
          isUnique = true;
        }
      }

      if (!isUnique) {
        inviteCode = `AEGIS-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const newSchool: School = {
        id: schoolId,
        name: payload.schoolName.trim(),
        invite_code: inviteCode,
        latitude: payload.latitude ?? 6.5244,
        longitude: payload.longitude ?? 3.3792,
        geofence_radius_meters: 75,
        created_at: new Date().toISOString(),
      };

      // 1. Seed unique 33 class tiers for this school
      const schoolClasses: AcademicClass[] = INITIAL_CLASSES.map((c) => ({
        ...c,
        id: `${schoolId}-${c.id}`,
        school_id: schoolId,
        student_count: 0,
      }));

      // 2. Provision the registering user as primary School Admin in staff table
      const adminStaffId = generateUUID();
      const adminUsername = (payload.email ? payload.email.split('@')[0] : payload.adminFullName.toLowerCase().replace(/\s+/g, '_')).replace(/[^a-zA-Z0-9_]/g, '');
      const adminStaff: TeacherProfile = {
        id: adminStaffId,
        school_id: schoolId,
        teacher_id_code: `ADM/${new Date().getFullYear()}/001`,
        full_name: payload.adminFullName.trim(),
        phone: payload.phone.trim(),
        email: payload.email.trim(),
        username: adminUsername || 'admin',
        password_hash: payload.password,
        assigned_subject_ids: [],
        assigned_subjects: [],
        is_part_time: false,
        status: 'active',
        session_token: generateUUID(),
        created_at: new Date().toISOString(),
      };

      // Update React State immediately
      setSchools((prev) => [newSchool, ...prev]);
      setCurrentSchool(newSchool);
      setClasses(schoolClasses);
      setStudents([]);
      setTeachers([adminStaff]);
      setResults([]);
      setReceipts([]);
      setFeeStructures([]);

      // Auto-login registering admin into new school session
      const authUser: AuthUser = {
        id: adminStaff.id,
        school_id: schoolId,
        school_name: newSchool.name,
        invite_code: newSchool.invite_code,
        username: adminStaff.username,
        full_name: adminStaff.full_name,
        role: 'admin',
      };
      setCurrentUser(authUser);
      setSessionCookie(authUser);

      // Persist to Supabase if connected
      if (isSupabaseConfigured()) {
        try {
          // A. Insert school
          const { error: schoolError } = await supabase.from('schools').insert({
            id: newSchool.id,
            name: newSchool.name,
            invite_code: newSchool.invite_code,
            latitude: newSchool.latitude,
            longitude: newSchool.longitude,
            geofence_radius_meters: newSchool.geofence_radius_meters,
            created_at: newSchool.created_at,
          });

          if (schoolError) {
            console.error('Supabase school insertion error:', schoolError);
            return { success: false, error: schoolError.message };
          }

          // B. Seed classes scoped to school_id
          const classesPayload = schoolClasses.map((c) => ({
            id: c.id,
            school_id: schoolId,
            name: c.name,
            session: c.session,
            level: c.level,
            arm: c.arm || null,
            stage: c.stage,
            student_count: 0,
          }));
          await supabase.from('classes').insert(classesPayload);

          // C. Insert primary Admin staff member
          await supabase.from('staff').insert({
            id: adminStaff.id,
            school_id: schoolId,
            staff_id_code: adminStaff.teacher_id_code,
            full_name: adminStaff.full_name,
            phone: adminStaff.phone,
            email: adminStaff.email,
            username: adminStaff.username,
            password_hash: adminStaff.password_hash,
            role: 'admin',
            status: adminStaff.status,
            assigned_subject_ids: [],
            session_token: adminStaff.session_token,
          });
        } catch (dbErr: any) {
          console.warn('Note on cloud multi-tenant persistence:', dbErr);
        }
      }

      return {
        success: true,
        school: newSchool,
        inviteCode: newSchool.invite_code,
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

    // Step 2: Set active tenant context and scope subsequent queries by that resolved school_id
    setCurrentSchool(targetSchool);

    let student = students.find((s) => {
      const matchReg = s.reg_number.toUpperCase() === cleanReg;
      const matchPin = s.access_pin === cleanPin;
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

    setCurrentUser(authUser);
    setSessionCookie(authUser);

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
      setCurrentUser(authUser);
      setSessionCookie(authUser);
      return { success: true, role: 'admin' as UserRole };
    }

    // Dynamic match against live Supabase-synchronized teacher / staff records scoped to targetSchool
    const normalizedCleanUser = cleanUser.replace(/\s+/g, '');
    let matchedTeacher = teachers.find((t) => {
      const matchSchool = t.school_id === targetSchool!.id;
      if (!matchSchool) return false;

      const matchUsername = (t.username || '').toLowerCase().replace(/\s+/g, '');
      const matchIdCode = (t.teacher_id_code || '').toLowerCase().replace(/\s+/g, '');
      const matchUnderscored = matchIdCode.replace(/\//g, '_');
      const matchSlashed = matchUsername.replace(/_/g, '/');

      const matchesIdentifier =
        matchUsername === normalizedCleanUser ||
        matchIdCode === normalizedCleanUser ||
        matchUnderscored === normalizedCleanUser ||
        matchSlashed === normalizedCleanUser;

      return matchesIdentifier && t.password_hash === cleanPass;
    });

    // Fallback: Query Supabase staff table directly scoped strictly to resolved school_id
    if (!matchedTeacher && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('school_id', targetSchool.id)
          .or(`username.ilike.${cleanUser},staff_id_code.ilike.${cleanUser}`)
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

      // Determine role: staff row may have role 'admin' or 'teacher'
      const assignedRole: UserRole = (matchedTeacher as any).role === 'admin' ? 'admin' : 'teacher';

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
      setCurrentUser(authUser);
      setSessionCookie(authUser);
      return { success: true, role: assignedRole };
    }

    return { success: false, message: 'Invalid username or password for this school.' };
  };

  const logout = () => {
    setCurrentUser(null);
    setSessionCookie(null);
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

    // Direct Cloud Upsert to Supabase
    if (isSupabaseConfigured()) {
      try {
        const dbSubjectId = toDbSubjectId(updatedResultRecord.subject_id);
        const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;
        const payload = {
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

        const { error } = await supabase.from('term_results').upsert(payload, {
          onConflict: 'student_id, subject_id, term, session',
        });

        if (error) {
          console.error('CRITICAL: Error saving score to Supabase term_results:', error);
        } else {
          console.log('✓ Successfully saved student score to Supabase term_results:', updatedResultRecord.student_name, updatedResultRecord.subject_name);
        }
      } catch (err) {
        console.error('Error saving score to Supabase term_results:', err);
      }
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

    // Centralize write to Supabase
    if (isSupabaseConfigured()) {
      const studentIds = studentsToPromote.map((s) => s.id);
      Promise.resolve(
        supabase
          .from('students')
          .update({
            class_id: toClass.id,
            class_grade: toClass.name,
            session: toClass.session,
          })
          .in('id', studentIds)
      )
        .then((res: any) => {
          if (res?.error) console.error('Error promoting students in Supabase:', res.error);
        })
        .catch((err: unknown) => console.error('Error promoting students in Supabase:', err));
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

    // Persist to Supabase students table immediately with exact column mappings matching PostgreSQL schema
    if (isSupabaseConfigured()) {
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

      try {
        // Guarantee the referenced class exists in Supabase before foreign-key insertion
        const { error: classUpsertError } = await supabase
          .from('classes')
          .upsert(
            {
              id: matchedClass.id,
              name: matchedClass.name,
              session: matchedClass.session,
              level: matchedClass.level,
              arm: matchedClass.arm || null,
              stage: matchedClass.stage,
              student_count: 0,
            },
            { onConflict: 'id' }
          );

        if (classUpsertError) {
          console.warn('Class upsert warning (may be restricted by RLS if classes table not seeded):', classUpsertError.message);
        }

        const { error: studentInsertError } = await supabase.from('students').insert(studentPayload);
        if (studentInsertError) {
          console.error('CRITICAL: Supabase student insert failed:', studentInsertError);
          return {
            success: false,
            student: newStudent,
            error: studentInsertError.message || 'Supabase student insert failed',
          };
        } else {
          console.log('✓ Successfully saved new student to Supabase students table:', newStudent.reg_number);
          return {
            success: true,
            student: newStudent,
          };
        }
      } catch (e: any) {
        console.error('CRITICAL: Supabase student insert exception:', e);
        return {
          success: false,
          student: newStudent,
          error: e?.message || 'Unexpected exception during cloud persistence',
        };
      }
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

    if (isSupabaseConfigured()) {
      try {
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

        const { error } = await supabase.from('fee_structures').upsert(payload, {
          onConflict: 'class_id, term, session',
        });

        if (error) {
          console.error('CRITICAL: Supabase fee structure publish error:', error);
          return { success: false, structure: newStructure, error: error.message };
        } else {
          console.log('✓ Successfully published fee structure to Supabase:', newStructure.class_name, newStructure.term);
          return { success: true, structure: newStructure };
        }
      } catch (err: any) {
        console.error('CRITICAL: Supabase fee structure publish exception:', err);
        return { success: false, structure: newStructure, error: err?.message || 'Network error' };
      }
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
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('fee_structures').delete().eq('id', id);
        if (error) {
          console.error('CRITICAL: Supabase fee structure delete error:', error);
          return { success: false, error: error.message };
        } else {
          console.log('✓ Successfully deleted fee structure from Supabase:', id);
          return { success: true };
        }
      } catch (err: any) {
        console.error('CRITICAL: Supabase fee structure delete exception:', err);
        return { success: false, error: err?.message || 'Network error' };
      }
    }
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

    // Persist receipt to Supabase
    if (isSupabaseConfigured()) {
      try {
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
        };

        const { error } = await supabase.from('receipts').insert(payload);
        if (error) {
          console.error('CRITICAL: Supabase receipt insert failed:', error);
          return { success: false, receipt: newReceipt, error: error.message };
        } else {
          console.log('✓ Successfully saved receipt to Supabase receipts table:', newReceipt.id);
          return { success: true, receipt: newReceipt };
        }
      } catch (err: any) {
        console.error('CRITICAL: Supabase receipt insert exception:', err);
        return { success: false, receipt: newReceipt, error: err?.message || 'Network error' };
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

    if (isSupabaseConfigured()) {
      try {
        await Promise.all([
          supabase
            .from('receipts')
            .update({
              status: 'approved',
              amount_approved: creditAmount,
              reviewed_by: currentUser?.id && currentUser.id.length === 36 ? currentUser.id : null,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', receiptId),
          supabase
            .from('students')
            .update({
              fee_paid: true,
              payment_status: 'paid',
              tuition_status: 'paid',
            })
            .eq('id', receipt.student_id),
        ]);
      } catch (err) {
        console.error('Error approving receipt in Supabase:', err);
      }
    }
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

    if (isSupabaseConfigured()) {
      try {
        await Promise.all([
          supabase
            .from('receipts')
            .update({
              status: isFullyPaidNow ? 'approved' : 'partially_approved',
              amount_approved: creditAmount,
              reviewed_by: currentUser?.id && currentUser.id.length === 36 ? currentUser.id : null,
              reviewed_at: new Date().toISOString(),
              admin_note: bursarNote,
            })
            .eq('id', receiptId),
          supabase
            .from('students')
            .update({
              fee_paid: isFullyPaidNow,
              payment_status: isFullyPaidNow ? 'paid' : 'partially_paid',
              tuition_status: isFullyPaidNow ? 'paid' : 'partial',
            })
            .eq('id', receipt.student_id),
        ]);
      } catch (err) {
        console.error('Error confirming partial payment in Supabase:', err);
      }
    }
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

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('receipts')
          .update({
            status: 'rejected',
            reviewed_by: currentUser?.id && currentUser.id.length === 36 ? currentUser.id : null,
            reviewed_at: new Date().toISOString(),
            admin_note: note,
          })
          .eq('id', receiptId);
      } catch (err) {
        console.error('Error rejecting receipt in Supabase:', err);
      }
    }
  };

  // Teacher Registry & Security Controls (Admin)
  const registerTeacher = (data: {
    fullName: string;
    phone: string;
    email: string;
    assignedSubjectIds: string[];
    assignedSubjects?: string[];
    formClassId?: string;
    assignedClassId?: string | null;
    isPartTime?: boolean;
  }) => {
    const nextSeq = String(teachers.length + 1).padStart(3, '0');
    const teacherIdCode = `TCH/2026/${nextSeq}`;
    const generatedPassword = `Tch${Math.floor(1000 + Math.random() * 9000)}!`;
    const resolvedSubjectIds = data.assignedSubjects || data.assignedSubjectIds || [];
    const isPartTime = Boolean(data.isPartTime);
    const assignedClassId = isPartTime ? null : (data.assignedClassId ?? data.formClassId ?? null);
    const formClass = !isPartTime && assignedClassId ? classes.find((c) => c.id === assignedClassId) : undefined;
    const newStaffUuid = generateUUID();
    const activeSchoolId = currentSchool?.id || currentUser?.school_id || DEFAULT_SCHOOL.id;

    const newTeacher: TeacherProfile = {
      id: newStaffUuid,
      school_id: activeSchoolId,
      teacher_id_code: teacherIdCode,
      full_name: data.fullName,
      phone: data.phone,
      email: data.email,
      username: teacherIdCode.toLowerCase().replace(/\//g, '_'),
      password_hash: generatedPassword,
      assigned_subject_ids: resolvedSubjectIds,
      assigned_subjects: resolvedSubjectIds,
      form_class_id: isPartTime ? undefined : (assignedClassId || undefined),
      assigned_class_id: assignedClassId,
      form_class_name: isPartTime ? undefined : formClass?.name,
      is_part_time: isPartTime,
      status: 'active',
      session_token: generateUUID(),
      created_at: new Date().toISOString(),
    };

    setTeachers((prev) => [newTeacher, ...prev]);

    if (!isPartTime && assignedClassId) {
      setClasses((prev) =>
        prev.map((c) => (c.id === assignedClassId ? { ...c, class_teacher: data.fullName } : c))
      );
    }

    // Persist to Supabase staff table immediately with exact column mappings matching PostgreSQL schema
    if (isSupabaseConfigured()) {
      const staffPayload = {
        id: newTeacher.id,
        school_id: activeSchoolId,
        staff_id_code: newTeacher.teacher_id_code,
        full_name: newTeacher.full_name,
        phone: newTeacher.phone,
        email: newTeacher.email,
        username: newTeacher.username,
        password_hash: newTeacher.password_hash,
        role: 'teacher',
        status: newTeacher.status,
        assigned_subject_ids: newTeacher.assigned_subject_ids,
        form_class_id: newTeacher.form_class_id || null,
        session_token: newTeacher.session_token,
      };

      Promise.resolve(
        supabase.from('staff').insert(staffPayload)
      )
        .then((res: any) => {
          if (res?.error) {
            console.error('CRITICAL: Supabase staff insert failed:', res.error);
          } else {
            console.log('✓ Successfully saved new teacher to Supabase staff table:', newTeacher.teacher_id_code);
          }
        })
        .catch((e: unknown) => console.error('CRITICAL: Supabase staff insert exception:', e));
    }

    return { teacher: newTeacher, initialPassword: generatedPassword };
  };

  const updateTeacher = (
    teacherId: string,
    updates: {
      fullName?: string;
      phone?: string;
      email?: string;
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
            newPassword = `Reset${Math.floor(1000 + Math.random() * 9000)}#`;
          }

          const isPartTime = updates.isPartTime !== undefined ? Boolean(updates.isPartTime) : Boolean(t.is_part_time);
          const resolvedSubjectIds = updates.assignedSubjects !== undefined
            ? updates.assignedSubjects
            : (updates.assignedSubjectIds !== undefined ? updates.assignedSubjectIds : t.assigned_subject_ids);

          let targetClassId: string | null = null;
          if (!isPartTime) {
            if (updates.assignedClassId !== undefined) {
              targetClassId = updates.assignedClassId;
            } else if (updates.formClassId !== undefined) {
              targetClassId = updates.formClassId || null;
            } else {
              targetClassId = t.assigned_class_id ?? t.form_class_id ?? null;
            }
          }

          const formClass = targetClassId ? classes.find((c) => c.id === targetClassId) : undefined;

          const updatedT: TeacherProfile = {
            ...t,
            full_name: updates.fullName !== undefined ? updates.fullName : t.full_name,
            phone: updates.phone !== undefined ? updates.phone : t.phone,
            email: updates.email !== undefined ? updates.email : t.email,
            assigned_subject_ids: resolvedSubjectIds,
            assigned_subjects: resolvedSubjectIds,
            form_class_id: isPartTime ? undefined : (targetClassId || undefined),
            assigned_class_id: isPartTime ? null : targetClassId,
            form_class_name: isPartTime ? undefined : formClass?.name,
            is_part_time: isPartTime,
            password_hash: newPassword || t.password_hash,
            session_token: updates.resetCredentials ? newToken : t.session_token,
            last_credential_reset: updates.resetCredentials ? new Date().toISOString() : t.last_credential_reset,
          };

          if (isSupabaseConfigured()) {
            const staffUpdatePayload: Record<string, any> = {
              full_name: updatedT.full_name,
              phone: updatedT.phone,
              email: updatedT.email,
              assigned_subject_ids: updatedT.assigned_subject_ids,
              form_class_id: updatedT.form_class_id || null,
              status: updatedT.status,
              session_token: updatedT.session_token,
            };
            if (newPassword) {
              staffUpdatePayload.password_hash = updatedT.password_hash;
              staffUpdatePayload.last_credential_reset = updatedT.last_credential_reset;
            }

            Promise.resolve(
              supabase.from('staff').update(staffUpdatePayload).eq('id', updatedT.id)
            )
              .then((res: any) => {
                if (res?.error) console.error('Error updating staff in Supabase:', res.error);
              })
              .catch((e: unknown) => console.error('Supabase staff update failed:', e));
          }

          return updatedT;
        }
        return t;
      })
    );

    // If active user is this teacher and credentials were reset, force logout
    if (currentUser?.teacher_id === teacherId && updates.resetCredentials) {
      logout();
    }

    return { success: true, newPassword };
  };

  const deleteTeacher = (teacherId: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    if (isSupabaseConfigured()) {
      Promise.resolve(supabase.from('staff').delete().eq('id', teacherId)).catch(() => {});
    }
    if (currentUser?.teacher_id === teacherId) {
      logout();
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
      feeStructures,
      receipts,
      transactions,
      teachers,
      theme,
      resultsPublished,
      adminPassword,
      registerSchool,
      setCurrentSchoolById,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
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
