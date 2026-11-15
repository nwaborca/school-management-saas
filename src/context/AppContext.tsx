'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AuthUser,
  UserRole,
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
} from '@/lib/mockData';

interface AppContextType {
  schoolInfo: typeof SCHOOL_INFO;
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

  // Auth
  loginStudent: (regNumber: string, pin: string) => { success: boolean; message?: string; role?: UserRole };
  loginStaff: (username: string, pass: string) => { success: boolean; message?: string; role?: UserRole };
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
  }) => StudentProfile;

  // Tuition & Fee Status Toggle
  toggleStudentFeeStatus: (studentId: string, forceStatus?: boolean) => void;
  payInvoiceStub: (invoiceId: string) => void;
  addAnnouncement: (announcement: Omit<SchoolAnnouncement, 'id' | 'published_at'>) => void;

  // Fee Structure Builder (Admin)
  feeStructures: FeeStructure[];
  publishFeeStructure: (structure: Omit<FeeStructure, 'id' | 'published' | 'published_at'>) => FeeStructure;
  updateFeeStructure: (id: string, updates: Partial<FeeStructure>) => void;
  deleteFeeStructure: (id: string) => void;

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
  }) => void;
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [resultsPublished, setResultsPublished] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>('admin123');

  // Avoid unnecessary re-fetch loops
  const isFetchingRef = useRef(false);

  // Permanently locked to rich matte dark theme
  useEffect(() => {
    try {
      setTheme('dark');
      localStorage.setItem('apex_theme', 'dark');
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } catch {}
  }, []);

  const toggleTheme = () => {
    // Theme is permanently locked to matte dark mode
    setTheme('dark');
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    try {
      localStorage.setItem('apex_theme', 'dark');
    } catch {}
  };

  const toggleResultsPublished = () => {
    setResultsPublished((prev) => !prev);
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

  // Live Cloud Fetch from Supabase
  const fetchLiveData = useCallback(async () => {
    if (!isSupabaseConfigured() || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      // First ensure core classes exist in Supabase so foreign keys and dropdowns never fail
      try {
        const { data: existingClasses } = await supabase.from('classes').select('id');
        if (!existingClasses || existingClasses.length === 0) {
          const classesPayload = INITIAL_CLASSES.map((c) => ({
            id: c.id,
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

      const [stdRes, staffRes, resRes, classRes, feeRes, recRes] = await Promise.allSettled([
        supabase.from('students').select('*').order('created_at', { ascending: false }),
        supabase.from('staff').select('*').order('created_at', { ascending: false }),
        supabase.from('term_results').select('*').order('created_at', { ascending: false }),
        supabase.from('classes').select('*'),
        supabase.from('fee_structures').select('*'),
        supabase.from('receipts').select('*').order('created_at', { ascending: false }),
      ]);

      if (stdRes.status === 'fulfilled' && stdRes.value.data && Array.isArray(stdRes.value.data) && stdRes.value.data.length > 0) {
        setStudents(stdRes.value.data as StudentProfile[]);
      }
      if (staffRes.status === 'fulfilled' && staffRes.value.data && Array.isArray(staffRes.value.data) && staffRes.value.data.length > 0) {
        const normalizedStaff = (staffRes.value.data as any[]).map(normalizeTeacher);
        setTeachers(normalizedStaff);
      }
      if (resRes.status === 'fulfilled' && resRes.value.data && Array.isArray(resRes.value.data) && resRes.value.data.length > 0) {
        setResults(resRes.value.data as StudentResult[]);
      }
      if (classRes.status === 'fulfilled' && classRes.value.data && Array.isArray(classRes.value.data) && classRes.value.data.length > 0) {
        setClasses(classRes.value.data as AcademicClass[]);
      }
      if (feeRes.status === 'fulfilled' && feeRes.value.data && Array.isArray(feeRes.value.data) && feeRes.value.data.length > 0) {
        setFeeStructures(feeRes.value.data as FeeStructure[]);
      }
      if (recRes.status === 'fulfilled' && recRes.value.data && Array.isArray(recRes.value.data) && recRes.value.data.length > 0) {
        setReceipts(recRes.value.data as PaymentReceipt[]);
      }
    } catch (err) {
      console.error('Error fetching live data from Supabase:', err);
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

    // Realtime listener for 'staff' (Teachers, HODs, Faculty)
    const staffChannel = supabase
      .channel('public:staff_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
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
      .channel('public:students_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as StudentProfile;
            setStudents((prev) => {
              if (prev.some((s) => s.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as StudentProfile;
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
      .channel('public:term_results_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'term_results' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as StudentResult;
            setResults((prev) => {
              if (prev.some((r) => r.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as StudentResult;
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
      .channel('public:receipts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'receipts' },
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

    return () => {
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(studentChannel);
      supabase.removeChannel(resultsChannel);
      supabase.removeChannel(receiptsChannel);
    };
  }, []);

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

  // Student Login (Reg Number + PIN)
  const loginStudent = (regNumber: string, pin: string) => {
    const cleanReg = regNumber.trim().toUpperCase();
    const cleanPin = pin.trim();

    const student = students.find(
      (s) => s.reg_number.toUpperCase() === cleanReg && s.access_pin === cleanPin
    );

    if (!student) {
      return { success: false, message: 'Invalid registration number or PIN.' };
    }

    const authUser: AuthUser = {
      id: student.id,
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

  // Staff Login
  const loginStaff = (username: string, pass: string): { success: boolean; message?: string; role?: UserRole } => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (cleanUser === 'admin' && (cleanPass === adminPassword || cleanPass === 'admin123' || cleanPass === 'admin')) {
      const authUser: AuthUser = {
        id: 'usr-admin-1',
        username: 'admin',
        full_name: 'School Administrator',
        role: 'admin',
      };
      setCurrentUser(authUser);
      setSessionCookie(authUser);
      return { success: true, role: 'admin' as UserRole };
    }

    // Dynamic match against live Supabase-synchronized teacher records
    const normalizedCleanUser = cleanUser.replace(/\s+/g, '');
    const matchedTeacher = teachers.find((t) => {
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

    if (matchedTeacher) {
      if (matchedTeacher.status === 'revoked') {
        return { success: false, message: 'Invalid username or password.' };
      }

      const authUser: AuthUser = {
        id: matchedTeacher.id,
        username: matchedTeacher.username,
        full_name: matchedTeacher.full_name,
        role: 'teacher',
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
      return { success: true, role: 'teacher' as UserRole };
    }

    if (cleanUser === 'teacher' && (cleanPass === 'teacher123' || cleanPass === 'teacher')) {
      const defaultT = teachers[0];
      if (defaultT) {
        const authUser: AuthUser = {
          id: defaultT.id,
          username: defaultT.username || 'teacher',
          full_name: defaultT.full_name,
          role: 'teacher',
          teacher_id: defaultT.id,
          form_class_id: defaultT.is_part_time ? undefined : defaultT.form_class_id,
          assigned_class_id: defaultT.assigned_class_id ?? (defaultT.is_part_time ? null : (defaultT.form_class_id ?? null)),
          form_class_name: defaultT.is_part_time ? undefined : defaultT.form_class_name,
          assigned_subject_ids: defaultT.assigned_subject_ids,
          assigned_subjects: defaultT.assigned_subjects || defaultT.assigned_subject_ids,
          is_part_time: Boolean(defaultT.is_part_time),
          session_token: defaultT.session_token,
        };
        setCurrentUser(authUser);
        setSessionCookie(authUser);
        return { success: true, role: 'teacher' as UserRole };
      }
    }

    return { success: false, message: 'Invalid username or password.' };
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
        await supabase.from('term_results').upsert({
          student_id: updatedResultRecord.student_id,
          class_id: updatedResultRecord.class_id,
          subject_id: updatedResultRecord.subject_id,
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
        });
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
  const generateStudentProfile = (data: {
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
  }) => {
    const nextSeq = Math.floor(100 + Math.random() * 900);
    const regNumber = data.customRegNumber?.trim().toUpperCase() || `STU-2026-${nextSeq}`;
    const accessPin = data.customPin?.trim() || `${Math.floor(1000 + Math.random() * 9000)}`;

    const determinedRole = data.enrolledByRole || (currentUser?.role === 'teacher' ? 'Form Teacher' : 'Bursar');
    const determinedName = data.enrolledByName || currentUser?.full_name || 'System Administrator';

    const newStudent: StudentProfile = {
      id: generateUUID(),
      reg_number: regNumber,
      access_pin: accessPin,
      full_name: data.fullName,
      class_id: data.classId,
      class_grade: data.classGrade,
      session: '2025/2026',
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

    setStudents((prev) => [newStudent, ...prev]);

    setClasses((prev) =>
      prev.map((c) => (c.id === data.classId ? { ...c, student_count: c.student_count + 1 } : c))
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

    // Centralize write to Supabase cloud with exact database column mapping
    if (isSupabaseConfigured()) {
      Promise.resolve(
        supabase.from('students').insert({
          id: newStudent.id,
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
        })
      )
        .then((res: any) => {
          if (res?.error) console.error('Error inserting student to Supabase:', res.error);
        })
        .catch((e: unknown) => console.error('Supabase student insert failed:', e));
    }

    return newStudent;
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
  const publishFeeStructure = (data: Omit<FeeStructure, 'id' | 'published' | 'published_at'>): FeeStructure => {
    const newStructure: FeeStructure = {
      ...data,
      id: `fee-struct-${Date.now()}`,
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
      Promise.resolve(
        supabase.from('fee_structures').upsert({
          id: newStructure.id,
          class_id: newStructure.class_id,
          class_name: newStructure.class_name,
          term: newStructure.term,
          session: newStructure.session,
          line_items: newStructure.line_items,
          total_amount: newStructure.total_amount,
          published: newStructure.published,
          published_at: newStructure.published_at,
        })
      ).catch(() => {});
    }

    return newStructure;
  };

  const updateFeeStructure = (id: string, updates: Partial<FeeStructure>) => {
    setFeeStructures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const deleteFeeStructure = (id: string) => {
    setFeeStructures((prev) => prev.filter((f) => f.id !== id));
    if (isSupabaseConfigured()) {
      Promise.resolve(supabase.from('fee_structures').delete().eq('id', id)).catch(() => {});
    }
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

  const uploadReceipt = (
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
  ) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const receiptTerm = data.term || '1st Term';
    const receiptSession = data.session || SCHOOL_INFO.session || '2025/2026';

    const newReceipt: PaymentReceipt = {
      id: `rcpt-${Date.now()}`,
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
      Promise.resolve(
        supabase.from('receipts').insert({
          id: newReceipt.id,
          student_id: newReceipt.student_id,
          class_id: newReceipt.class_id,
          term: newReceipt.term,
          session: newReceipt.session,
          amount_claimed: newReceipt.amount_claimed,
          payment_mode: newReceipt.payment_mode,
          file_name: newReceipt.file_name,
          file_data_url: newReceipt.file_data_url,
          storage_path: newReceipt.storage_path,
          file_type: newReceipt.file_type,
          status: newReceipt.status,
          uploaded_at: newReceipt.uploaded_at,
        })
      )
        .then((res: any) => {
          if (res?.error) console.error('Error saving receipt to Supabase:', res.error);
        })
        .catch((e: unknown) => console.error('Supabase receipt insert failed:', e));
    }
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
              reviewed_by: 'Bursar Admin',
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
              reviewed_by: 'Bursar Admin',
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
            reviewed_by: 'Bursar Admin',
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

    const newTeacher: TeacherProfile = {
      id: newStaffUuid,
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

  return (
    <AppContext.Provider
      value={{
        schoolInfo: SCHOOL_INFO,
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
      }}
    >
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
