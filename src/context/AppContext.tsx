'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  classes: AcademicClass[];
  subjects: AcademicSubject[];
  allocations: TeacherSubjectAllocation[];
  results: StudentResult[];
  students: StudentProfile[];
  invoices: TuitionInvoice[];
  announcements: SchoolAnnouncement[];

  // Auth
  loginStudent: (regNumber: string, pin: string) => { success: boolean; message?: string };
  loginStaff: (username: string, pass: string) => { success: boolean; message?: string };
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
    formClassId?: string;
  }) => { teacher: TeacherProfile; initialPassword: string };
  updateTeacher: (
    teacherId: string,
    updates: {
      fullName?: string;
      phone?: string;
      email?: string;
      assignedSubjectIds?: string[];
      formClassId?: string;
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

// Helper to set cross-browser, mobile-resilient session cookie
function setSessionCookie(user: AuthUser | null) {
  if (typeof document === 'undefined') return;
  try {
    if (!user) {
      document.cookie = 'apex_auth_user=; path=/; max-age=0; SameSite=Lax';
    } else {
      const encoded = encodeURIComponent(JSON.stringify(user));
      // 7 days expiration
      document.cookie = `apex_auth_user=${encoded}; path=/; max-age=604800; SameSite=Lax`;
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
  return null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
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

  // Load and apply theme and results publishing gate from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('apex_theme') as 'dark' | 'light' | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('light', savedTheme === 'light');
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      } else {
        document.documentElement.classList.add('dark');
      }

      const savedPub = localStorage.getItem('apex_results_published');
      if (savedPub !== null) {
        setResultsPublished(savedPub === 'true');
      }

      const savedAdminPass = localStorage.getItem('apex_admin_password');
      if (savedAdminPass) {
        setAdminPassword(savedAdminPass);
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const nextTheme = prevTheme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('apex_theme', nextTheme);
      } catch {}
      document.documentElement.classList.toggle('light', nextTheme === 'light');
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');
      return nextTheme;
    });
  };

  const toggleResultsPublished = () => {
    setResultsPublished((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('apex_results_published', String(next));
      } catch {}
      return next;
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
    try {
      localStorage.setItem('apex_admin_password', newPass);
    } catch {}
    return { success: true };
  };

  // Restore session with schema validation to prevent stale cache bugs
  useEffect(() => {
    try {
      // Prioritize cookie for mobile Safari / Chrome storage isolation, fallback to localStorage
      const cookieUser = getSessionCookie();
      const savedUser = localStorage.getItem('apex_auth_user');
      const savedStudents = localStorage.getItem('apex_students');
      const savedClasses = localStorage.getItem('apex_classes');
      const savedResults = localStorage.getItem('apex_results');

      if (cookieUser) {
        setCurrentUser(cookieUser);
        try { localStorage.setItem('apex_auth_user', JSON.stringify(cookieUser)); } catch {}
      } else if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setSessionCookie(parsed);
      } else {
        // App starts logged out by default
        setCurrentUser(null);
        setSessionCookie(null);
      }

      if (savedClasses) {
        const parsed = JSON.parse(savedClasses);
        // Ensure classes have the stage property to avoid zero mapped subjects
        if (Array.isArray(parsed) && parsed.length >= 10 && parsed[0]?.stage) {
          setClasses(parsed);
        } else {
          setClasses(INITIAL_CLASSES);
          localStorage.setItem('apex_classes', JSON.stringify(INITIAL_CLASSES));
        }
      }

      // Ensure zero resurrected dummy records from stale mobile/desktop local caches
      const DUMMY_NAMES = ['lucas adeleke', 'zainab abubakar', 'chimera exe', 'chioma nwosu', 'emeka okafor', 'fatima bello'];
      const isDummyRecord = (name?: string, reg?: string) => {
        const cleanName = (name || '').toLowerCase();
        const cleanReg = (reg || '').toLowerCase();
        return DUMMY_NAMES.some((d) => cleanName.includes(d)) || cleanReg.startsWith('stu-2026-089') || cleanReg.startsWith('stu-2026-092') || cleanReg.startsWith('stu-2026-118');
      };

      if (savedStudents) {
        const parsed = JSON.parse(savedStudents);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.filter((s: StudentProfile) => !isDummyRecord(s.full_name, s.reg_number));
          const hydrated = sanitized.map((s: StudentProfile) => {
            const isFeePaid = s.fee_paid !== undefined ? s.fee_paid : s.tuition_status === 'paid';
            const payStatus = s.payment_status || (isFeePaid ? 'paid' : 'unpaid');
            return {
              ...s,
              fee_paid: isFeePaid,
              payment_status: payStatus,
              enrolled_by_role: s.enrolled_by_role || 'Bursar',
              enrolled_by_name: s.enrolled_by_name || 'Finance Desk',
              enrollment_date: s.enrollment_date || s.created_at || new Date().toISOString(),
            };
          });
          setStudents(hydrated);
          // If dummies were purged, synchronize local cache immediately
          if (hydrated.length !== parsed.length) {
            try { localStorage.setItem('apex_students', JSON.stringify(hydrated)); } catch {}
          }
        } else {
          setStudents([]);
        }
      }

      // Fetch live data from Supabase if configured
      if (isSupabaseConfigured()) {
        const fetchLiveData = async () => {
          try {
            const [stdRes, staffRes, resRes, classRes, feeRes, recRes] = await Promise.all([
              supabase.from('students').select('*'),
              supabase.from('staff').select('*'),
              supabase.from('term_results').select('*'),
              supabase.from('classes').select('*'),
              supabase.from('fee_structures').select('*'),
              supabase.from('receipts').select('*'),
            ]);

            if (stdRes.data && Array.isArray(stdRes.data)) {
              setStudents(stdRes.data as StudentProfile[]);
              try { localStorage.setItem('apex_students', JSON.stringify(stdRes.data)); } catch {}
            }
            if (staffRes.data && Array.isArray(staffRes.data)) {
              setTeachers(staffRes.data as TeacherProfile[]);
              try { localStorage.setItem('apex_teachers', JSON.stringify(staffRes.data)); } catch {}
            }
            if (resRes.data && Array.isArray(resRes.data)) {
              setResults(resRes.data as StudentResult[]);
              try { localStorage.setItem('apex_results', JSON.stringify(resRes.data)); } catch {}
            }
            if (classRes.data && Array.isArray(classRes.data) && classRes.data.length > 0) {
              setClasses(classRes.data as AcademicClass[]);
            }
            if (feeRes.data && Array.isArray(feeRes.data)) {
              setFeeStructures(feeRes.data as FeeStructure[]);
            }
            if (recRes.data && Array.isArray(recRes.data)) {
              setReceipts(recRes.data as PaymentReceipt[]);
            }
          } catch (err) {
            console.error('Error fetching data from Supabase:', err);
          }
        };
        fetchLiveData();
      }

      if (savedResults) {
        const parsedRes = JSON.parse(savedResults);
        if (Array.isArray(parsedRes)) {
          setResults(parsedRes.filter((r: StudentResult) => !isDummyRecord(r.student_name)));
        }
      }

      const savedTeachers = localStorage.getItem('apex_teachers');
      if (savedTeachers) {
        const parsedT = JSON.parse(savedTeachers);
        if (Array.isArray(parsedT) && parsedT.length > 0) {
          setTeachers(parsedT);
        }
      }

      const savedTransactions = localStorage.getItem('apex_transactions');
      if (savedTransactions) {
        const parsedTx = JSON.parse(savedTransactions);
        if (Array.isArray(parsedTx) && parsedTx.length > 0) {
          setTransactions(parsedTx.filter((tx: PaymentTransaction) => !isDummyRecord(tx.student_name)));
        }
      }

      const savedReceipts = localStorage.getItem('apex_receipts');
      if (savedReceipts) {
        const parsedR = JSON.parse(savedReceipts);
        if (Array.isArray(parsedR) && parsedR.length > 0) {
          setReceipts(parsedR.filter((rc: PaymentReceipt) => !isDummyRecord(rc.student_name)));
        }
      }
    } catch {}
  }, []);

  const saveStudents = (newStudents: StudentProfile[]) => {
    setStudents(newStudents);
    try {
      localStorage.setItem('apex_students', JSON.stringify(newStudents));
    } catch {}
  };

  const saveTransactions = (newTx: PaymentTransaction[]) => {
    setTransactions(newTx);
    try {
      localStorage.setItem('apex_transactions', JSON.stringify(newTx));
    } catch {}
  };

  const saveReceipts = (newReceipts: PaymentReceipt[]) => {
    setReceipts(newReceipts);
    try {
      localStorage.setItem('apex_receipts', JSON.stringify(newReceipts));
    } catch {}
  };

  const saveClasses = (newClasses: AcademicClass[]) => {
    setClasses(newClasses);
    try {
      localStorage.setItem('apex_classes', JSON.stringify(newClasses));
    } catch {}
  };

  const saveResults = (newResults: StudentResult[]) => {
    setResults(newResults);
    try {
      localStorage.setItem('apex_results', JSON.stringify(newResults));
    } catch {}
  };

  // Student Fee Status Toggle (Admin can toggle "Mark School Fees as Paid" / "Pending")
  const toggleStudentFeeStatus = (studentId: string, forceStatus?: boolean) => {
    let nextFeePaidState = false;

    const updatedStudents = students.map((std) => {
      if (std.id === studentId) {
        nextFeePaidState = forceStatus !== undefined ? forceStatus : !std.fee_paid;
        return {
          ...std,
          fee_paid: nextFeePaidState,
          payment_status: nextFeePaidState ? ('paid' as const) : ('unpaid' as const),
          tuition_status: nextFeePaidState ? ('paid' as const) : ('pending' as const),
        };
      }
      return std;
    });

    saveStudents(updatedStudents);

    // Synchronize corresponding invoices
    const targetStudent = updatedStudents.find((s) => s.id === studentId);
    if (targetStudent) {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.student_id === studentId || inv.reg_number === targetStudent.reg_number) {
            return {
              ...inv,
              fee_paid: targetStudent.fee_paid,
              status: targetStudent.fee_paid ? 'paid' : 'pending',
              paid_amount: targetStudent.fee_paid ? inv.total_amount : 0,
              paid_at: targetStudent.fee_paid ? new Date().toISOString() : undefined,
            };
          }
          return inv;
        })
      );
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
      return { success: false, message: 'Invalid Registration Number or Access PIN.' };
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
    try {
      localStorage.setItem('apex_auth_user', JSON.stringify(authUser));
      setSessionCookie(authUser);
    } catch {}

    return { success: true };
  };

  // Staff Login
  const loginStaff = (username: string, pass: string) => {
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
      try {
        localStorage.setItem('apex_auth_user', JSON.stringify(authUser));
        setSessionCookie(authUser);
      } catch {}
      return { success: true };
    }

    // Dynamic match against registered teachers
    const matchedTeacher = teachers.find(
      (t) =>
        (t.username.toLowerCase() === cleanUser || t.teacher_id_code.toLowerCase() === cleanUser) &&
        t.password_hash === cleanPass
    );

    if (matchedTeacher) {
      if (matchedTeacher.status === 'revoked') {
        return { success: false, message: 'This teacher account credentials have been revoked by administration.' };
      }

      const authUser: AuthUser = {
        id: matchedTeacher.id,
        username: matchedTeacher.username,
        full_name: matchedTeacher.full_name,
        role: 'teacher',
        teacher_id: matchedTeacher.id,
        form_class_id: matchedTeacher.form_class_id,
        form_class_name: matchedTeacher.form_class_name,
        assigned_subject_ids: matchedTeacher.assigned_subject_ids,
        session_token: matchedTeacher.session_token,
      };
      setCurrentUser(authUser);
      try {
        localStorage.setItem('apex_auth_user', JSON.stringify(authUser));
        setSessionCookie(authUser);
      } catch {}
      return { success: true };
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
          form_class_id: defaultT.form_class_id,
          form_class_name: defaultT.form_class_name,
          assigned_subject_ids: defaultT.assigned_subject_ids,
          session_token: defaultT.session_token,
        };
        setCurrentUser(authUser);
        try {
          localStorage.setItem('apex_auth_user', JSON.stringify(authUser));
          setSessionCookie(authUser);
        } catch {}
        return { success: true };
      }
    }

    return { success: false, message: 'Invalid Staff credentials. Use admin/admin123 or registered Teacher ID / Password.' };
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('apex_auth_user');
      setSessionCookie(null);
    } catch {}
  };

  // Teacher Score Entry Portal:
  // Automatically calculate Total Score (CA1 + CA2 + Exam) and assign letter grades (A, B, C, D, F)
  const updateStudentScore = (
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

    let updatedResults: StudentResult[];

    if (existingIndex >= 0) {
      updatedResults = results.map((r, i) =>
        i === existingIndex
          ? {
              ...r,
              ca1,
              ca2,
              exam,
              total_score: total,
              grade,
              remarks,
              graded_at: new Date().toISOString().split('T')[0],
              audited_by: currentUser?.full_name || currentUser?.username || 'Authorized Staff',
              audit_timestamp: new Date().toISOString(),
            }
          : r
      );
    } else {
      const student = students.find((s) => s.id === studentId);
      const subject = subjects.find((sb) => sb.id === subjectId);
      const newResult: StudentResult = {
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
      updatedResults = [...results, newResult];
    }

    saveResults(updatedResults);
  };

  // Admin Class Management: Promote Class (e.g. SS1 Science A -> SS2 Science A)
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

    // Update students to target class
    const updatedStudents = students.map((s) => {
      if (s.class_id === fromClassId) {
        return {
          ...s,
          class_id: toClass.id,
          class_grade: toClass.name,
          session: toClass.session,
        };
      }
      return s;
    });

    // Update student counts in class objects
    const updatedClasses = classes.map((c) => {
      if (c.id === fromClassId) {
        return { ...c, student_count: Math.max(0, c.student_count - studentsToPromote.length) };
      }
      if (c.id === toClassId) {
        return { ...c, student_count: c.student_count + studentsToPromote.length };
      }
      return c;
    });

    saveStudents(updatedStudents);
    saveClasses(updatedClasses);

    // If current logged-in student was in that class, update active session
    if (currentUser?.class_id === fromClassId) {
      const updatedUser: AuthUser = {
        ...currentUser,
        class_id: toClass.id,
        class_grade: toClass.name,
      };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('apex_auth_user', JSON.stringify(updatedUser));
      } catch {}
    }

    // Add announcement log
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
      id: `std-${Date.now()}`,
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

    const updated = [newStudent, ...students];
    saveStudents(updated);

    // Update class student count
    const updatedClasses = classes.map((c) =>
      c.id === data.classId ? { ...c, student_count: c.student_count + 1 } : c
    );
    saveClasses(updatedClasses);

    // Seed default invoice
    const newInvoice: TuitionInvoice = {
      id: `inv-${Date.now()}`,
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
      const updated = students.map((s) =>
        s.id === matched.student_id ? { ...s, tuition_status: 'paid' as const } : s
      );
      saveStudents(updated);
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

  // ── Fee Structure Builder ──────────────────────────────────────────────────
  const publishFeeStructure = (data: Omit<FeeStructure, 'id' | 'published' | 'published_at'>): FeeStructure => {
    const newStructure: FeeStructure = {
      ...data,
      id: `fee-struct-${Date.now()}`,
      published: true,
      published_at: new Date().toISOString().split('T')[0],
    };
    setFeeStructures((prev) => {
      // Replace existing structure for same class+term, or prepend new
      const filtered = prev.filter(
        (f) => !(f.class_id === data.class_id && f.term === data.term && f.session === data.session)
      );
      return [newStructure, ...filtered];
    });
    return newStructure;
  };

  const updateFeeStructure = (id: string, updates: Partial<FeeStructure>) => {
    setFeeStructures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const deleteFeeStructure = (id: string) => {
    setFeeStructures((prev) => prev.filter((f) => f.id !== id));
  };

  // ── Receipt Upload & Verification & Debt Ledger ─────────────────────────────
  const getStudentTermLedger = (studentId: string, term: string) => {
    const student = students.find((s) => s.id === studentId);
    // Find published fee structure for student's class and term
    const feeStructure =
      feeStructures.find((fs) => fs.class_id === student?.class_id && fs.term === term && fs.published) ||
      feeStructures.find((fs) => fs.class_id === student?.class_id && fs.published);

    const termInvoice = invoices.find(
      (inv) => inv.student_id === studentId && (inv.term === term || (!inv.term && term === '1st Term'))
    );

    const totalTermFee = feeStructure ? feeStructure.total_amount : termInvoice?.total_amount || 235000;

    // Filter confirmed transactions for this student and term
    const studentTx = transactions.filter(
      (tx) => tx.student_id === studentId && tx.term === term
    );

    // Sum total credited payments
    let totalPaid = studentTx.reduce((sum, tx) => sum + tx.amount_credited, 0);

    // If student has an approved full receipt or paid invoice or legacy fee_paid status on 1st Term
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

    const updatedReceipts = [newReceipt, ...receipts];
    saveReceipts(updatedReceipts);

    // Mark student status as pending_verification
    const updatedStudents = students.map((s) =>
      s.id === studentId
        ? {
            ...s,
            payment_status: 'pending_verification' as const,
            fee_paid: false,
            tuition_status: 'pending' as const,
          }
        : s
    );
    saveStudents(updatedStudents);

    // Update corresponding invoice to pending
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.student_id === studentId && (inv.term === receiptTerm || !inv.term)
          ? { ...inv, status: 'pending' as const, fee_paid: false }
          : inv
      )
    );
  };

  const approveReceipt = (receiptId: string) => {
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!receipt) return;

    const receiptTerm = receipt.term || '1st Term';
    const receiptSession = receipt.session || SCHOOL_INFO.session || '2025/2026';

    // Retrieve ledger to calculate balance to zero out
    const feeStructure =
      feeStructures.find((fs) => fs.class_id === receipt.class_id && fs.term === receiptTerm && fs.published) ||
      feeStructures.find((fs) => fs.class_id === receipt.class_id && fs.published);
    const totalTermFee = feeStructure ? feeStructure.total_amount : 235000;

    // Previous paid in transactions for this term
    const priorPaid = transactions
      .filter((tx) => tx.student_id === receipt.student_id && tx.term === receiptTerm)
      .reduce((sum, tx) => sum + tx.amount_credited, 0);

    const creditAmount = Math.max(0, totalTermFee - priorPaid > 0 ? totalTermFee - priorPaid : receipt.amount_claimed);

    const updatedReceipts = receipts.map((r) =>
      r.id === receiptId
        ? {
            ...r,
            status: 'approved' as ReceiptStatus,
            amount_approved: creditAmount,
            reviewed_by: 'Bursar Admin',
            reviewed_at: new Date().toISOString(),
          }
        : r
    );
    saveReceipts(updatedReceipts);

    // Add confirmed transaction record
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

    saveTransactions([newTx, ...transactions]);

    // Student is now fully cleared for results
    const updatedStudents = students.map((s) =>
      s.id === receipt.student_id
        ? {
            ...s,
            payment_status: 'paid' as const,
            fee_paid: true,
            tuition_status: 'paid' as const,
          }
        : s
    );
    saveStudents(updatedStudents);

    // Update invoice
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
  };

  const confirmPartialPayment = (receiptId: string, approvedAmount?: number, bursarNote?: string) => {
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!receipt) return;

    const receiptTerm = receipt.term || '1st Term';
    const receiptSession = receipt.session || SCHOOL_INFO.session || '2025/2026';

    const feeStructure =
      feeStructures.find((fs) => fs.class_id === receipt.class_id && fs.term === receiptTerm && fs.published) ||
      feeStructures.find((fs) => fs.class_id === receipt.class_id && fs.published);
    const totalTermFee = feeStructure ? feeStructure.total_amount : 235000;

    const creditAmount = approvedAmount !== undefined ? approvedAmount : receipt.amount_claimed;

    // Prior paid in transactions for this term
    const priorPaid = transactions
      .filter((tx) => tx.student_id === receipt.student_id && tx.term === receiptTerm)
      .reduce((sum, tx) => sum + tx.amount_credited, 0);

    const newTotalPaid = priorPaid + creditAmount;
    const newRemainingDebt = Math.max(0, totalTermFee - newTotalPaid);
    const isFullyPaidNow = newRemainingDebt === 0;

    const updatedReceipts = receipts.map((r) =>
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
    );
    saveReceipts(updatedReceipts);

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

    saveTransactions([newTx, ...transactions]);

    // Update student: locked result slip if remaining debt > 0
    const updatedStudents = students.map((s) =>
      s.id === receipt.student_id
        ? {
            ...s,
            payment_status: isFullyPaidNow ? ('paid' as const) : ('partially_paid' as const),
            fee_paid: isFullyPaidNow,
            tuition_status: isFullyPaidNow ? ('paid' as const) : ('partial' as const),
          }
        : s
    );
    saveStudents(updatedStudents);

    // Update invoice
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
  };

  const rejectReceipt = (receiptId: string, note?: string) => {
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!receipt) return;

    const receiptTerm = receipt.term || '1st Term';

    const updatedReceipts = receipts.map((r) =>
      r.id === receiptId
        ? {
            ...r,
            status: 'rejected' as ReceiptStatus,
            reviewed_by: 'Bursar Admin',
            reviewed_at: new Date().toISOString(),
            admin_note: note || 'Proof of payment rejected. Please review and re-upload valid bank transfer receipt.',
          }
        : r
    );
    saveReceipts(updatedReceipts);

    // Recompute current student payment status from remaining transactions
    const priorPaid = transactions
      .filter((tx) => tx.student_id === receipt.student_id && tx.term === receiptTerm)
      .reduce((sum, tx) => sum + tx.amount_credited, 0);

    const hasPriorDeposit = priorPaid > 0;

    const updatedStudents = students.map((s) =>
      s.id === receipt.student_id
        ? {
            ...s,
            payment_status: hasPriorDeposit ? ('partially_paid' as const) : ('unpaid' as const),
            fee_paid: false,
            tuition_status: hasPriorDeposit ? ('partial' as const) : ('pending' as const),
          }
        : s
    );
    saveStudents(updatedStudents);

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.student_id === receipt.student_id && (inv.term === receiptTerm || !inv.term)
          ? { ...inv, fee_paid: false, status: hasPriorDeposit ? ('partial' as const) : ('pending' as const) }
          : inv
      )
    );
  };

  const saveTeachers = (newTeachers: TeacherProfile[]) => {
    setTeachers(newTeachers);
    try {
      localStorage.setItem('apex_teachers', JSON.stringify(newTeachers));
    } catch {}
  };

  // ── Teacher Registry & Security Controls ──────────────────────────────────
  const registerTeacher = (data: {
    fullName: string;
    phone: string;
    email: string;
    assignedSubjectIds: string[];
    formClassId?: string;
  }) => {
    const nextSeq = String(teachers.length + 1).padStart(3, '0');
    const teacherIdCode = `TCH/2026/${nextSeq}`;
    const generatedPassword = `Tch${Math.floor(1000 + Math.random() * 9000)}!`;
    const formClass = classes.find((c) => c.id === data.formClassId);

    const newTeacher: TeacherProfile = {
      id: `t-${Date.now()}`,
      teacher_id_code: teacherIdCode,
      full_name: data.fullName,
      phone: data.phone,
      email: data.email,
      username: teacherIdCode.toLowerCase().replace(/\//g, '_'),
      password_hash: generatedPassword,
      assigned_subject_ids: data.assignedSubjectIds,
      form_class_id: data.formClassId,
      form_class_name: formClass?.name,
      status: 'active',
      session_token: `token-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    const updated = [newTeacher, ...teachers];
    saveTeachers(updated);

    // Also update class teacher name on academic classes if assigned as Form Teacher
    if (data.formClassId) {
      const updatedClasses = classes.map((c) =>
        c.id === data.formClassId ? { ...c, class_teacher: data.fullName } : c
      );
      saveClasses(updatedClasses);
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
      formClassId?: string;
      resetCredentials?: boolean;
    }
  ) => {
    let newPassword: string | undefined = undefined;
    const newToken = `token-${Date.now()}`;

    const formClass = updates.formClassId !== undefined
      ? classes.find((c) => c.id === updates.formClassId)
      : undefined;

    const updatedTeachers = teachers.map((t) => {
      if (t.id === teacherId) {
        if (updates.resetCredentials) {
          newPassword = `Reset${Math.floor(1000 + Math.random() * 9000)}#`;
        }

        const updatedT: TeacherProfile = {
          ...t,
          full_name: updates.fullName !== undefined ? updates.fullName : t.full_name,
          phone: updates.phone !== undefined ? updates.phone : t.phone,
          email: updates.email !== undefined ? updates.email : t.email,
          assigned_subject_ids: updates.assignedSubjectIds !== undefined ? updates.assignedSubjectIds : t.assigned_subject_ids,
          form_class_id: updates.formClassId !== undefined ? updates.formClassId : t.form_class_id,
          form_class_name: updates.formClassId !== undefined ? formClass?.name : t.form_class_name,
          password_hash: newPassword || t.password_hash,
          session_token: updates.resetCredentials ? newToken : t.session_token,
          last_credential_reset: updates.resetCredentials ? new Date().toISOString() : t.last_credential_reset,
        };
        return updatedT;
      }
      return t;
    });

    saveTeachers(updatedTeachers);

    // If active user is this teacher and credentials were reset, force logout
    if (currentUser?.teacher_id === teacherId && updates.resetCredentials) {
      logout();
    }

    return { success: true, newPassword };
  };

  const deleteTeacher = (teacherId: string) => {
    const updated = teachers.filter((t) => t.id !== teacherId);
    saveTeachers(updated);
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
