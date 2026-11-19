'use client';

import { AnimatedContent } from '@/components/AnimatedContent';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatNaira, calculateGradeAndRemark, isEarlyYearsClass, EarlyYearsMastery, EarlyYearsDomainRatings, EarlyYearsCommentary } from '@/types';
import { filterSubjectsForClassAndStream, getSeniorStreamForClass } from '@/lib/streamSpecialization';
import EnrollStudentForm from '@/components/EnrollStudentForm';
import {
  BookOpen,
  GraduationCap,
  Users,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet,
  CheckSquare,
  Sparkles,
  Save,
  Filter,
  UserPlus,
  Wifi,
  WifiOff,
  CloudUpload,
  RefreshCw,
  QrCode,
  MapPin,
  Clock,
  AlertCircle,
  LogOut,
  Camera,
  ShieldCheck,
  UserCheck,
  KeyRound,
  Check,
  X,
  ScanLine,
} from 'lucide-react';

const StaffAttendanceScannerModal = dynamic(
  () => import('@/components/StaffAttendanceScannerModal'),
  { ssr: false }
);

export default function AcademicHubPage() {
  const router = useRouter();
  const {
    schoolInfo,
    currentSchool,
    classes = [],
    subjects = [],
    teachers = [],
    students = [],
    results = [],
    staffAttendance = [],
    pickupPasses = [],
    updateStudentScore,
    updateEarlyYearsCommentary,
    clockInStaff,
    clockOutStaff,
    verifyAndHandoverPass,
    currentUser,
    isAuthReady,
  } = useApp();

  // Phase 3: Teacher Geofenced QR Attendance State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [cachedCoords, setCachedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [attendanceNotice, setAttendanceNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Phase 4: Safe Pick-Up Gate Verification State
  const [pickupInputCode, setPickupInputCode] = useState('');
  const [isVerifyingPass, setIsVerifyingPass] = useState(false);
  const [isPassScannerOpen, setIsPassScannerOpen] = useState(false);
  const [verifiedPassResult, setVerifiedPassResult] = useState<{
    pass: any;
    student: any;
  } | null>(null);
  const [gateNotice, setGateNotice] = useState<{
    type: 'success' | 'error';
    message: string;
    reason?: string;
  } | null>(null);

  // Early Years Grading State (Creche, KG, Nursery)
  const [eyPupilComments, setEyPupilComments] = useState<Record<string, EarlyYearsCommentary>>({});
  const [eySavingNotice, setEySavingNotice] = useState<string | null>(null);

  // Route Guard: Strictly require teacher role (Admins have Admin & Bursar Hubs)
  useEffect(() => {
    if (!isAuthReady) return;
    if (!currentUser) {
      router.push('/login');
    } else if (currentUser.role === 'student') {
      router.push('/student-hub');
    } else if (currentUser.role === 'admin') {
      router.push('/admin-hub');
    }
  }, [currentUser, isAuthReady, router]);

  const loggedTeacher =
    teachers.find((t) => t.id === currentUser?.teacher_id || t.username === currentUser?.username) || null;

  const teacherName = currentUser?.full_name || loggedTeacher?.full_name || 'Faculty Educator';

  const [activeTab, setActiveTab] = useState<'entry' | 'form_roster' | 'pickup_gate' | 'enroll_student'>('entry');

  const assignedSubjectIds = loggedTeacher?.assigned_subjects || loggedTeacher?.assigned_subject_ids || [];
  const formClassId = loggedTeacher?.is_part_time ? undefined : (loggedTeacher?.assigned_class_id || loggedTeacher?.form_class_id);
  const formClass = classes.find((c) => c.id === formClassId);

  // Teacher selectable subjects: strictly restricted to their assigned subjects if teacher
  const teacherSubjects = useMemo(() => {
    if (currentUser?.role === 'admin') return subjects;
    if (assignedSubjectIds.length > 0) {
      const filtered = subjects.filter((s) => assignedSubjectIds.includes(s.id));
      return filtered.length > 0 ? filtered : subjects;
    }
    return subjects;
  }, [subjects, assignedSubjectIds, currentUser?.role]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    teacherSubjects[0]?.id || subjects[0]?.id || ''
  );

  React.useEffect(() => {
    if (teacherSubjects.length > 0 && !teacherSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(teacherSubjects[0].id);
    }
  }, [teacherSubjects]);

  // Find classes offering the currently selected subject
  const classesOfferingSubject = useMemo(() => {
    if (!selectedSubjectId) return classes;
    return classes.filter((cls) => {
      const subs = filterSubjectsForClassAndStream(subjects, cls);
      return subs.some((s) => s.id === selectedSubjectId);
    });
  }, [classes, subjects, selectedSubjectId]);

  // Selected class filter: 'all' to show all students offering the subject, or a specific class
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Verify selectedClassId is valid whenever selectedSubjectId changes
  React.useEffect(() => {
    if (selectedClassId !== 'all' && !classesOfferingSubject.some((c) => c.id === selectedClassId)) {
      setSelectedClassId('all');
    }
  }, [classesOfferingSubject]);

  const currentClass = selectedClassId === 'all' ? null : classes.find((c) => c.id === selectedClassId);

  const [selectedTerm, setSelectedTerm] = useState('1st Term');
  const [session] = useState('2025/2026');
  const [saveToast, setSaveToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- MODULE 3: Offline-First Caching & Auto-Sync Engine ---
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingQueue, setPendingQueue] = useState<Array<{
    key: string;
    studentId: string;
    subjectId: string;
    classId: string;
    term: string;
    session: string;
    scores: { ca1: number; ca2: number; exam: number };
    timestamp: string;
  }>>([]);

  const OFFLINE_STORAGE_PREFIX = 'apex_offline_scores_';

  // Initialize online status & pending sync queue from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const loadPendingFromStorage = () => {
        try {
          const items: typeof pendingQueue = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(OFFLINE_STORAGE_PREFIX)) {
              const val = localStorage.getItem(key);
              if (val) {
                const parsed = JSON.parse(val);
                items.push({ ...parsed, key });
              }
            }
          }
          setPendingQueue(items);
        } catch (e) {
          console.error('Failed reading offline score queue:', e);
        }
      };

      loadPendingFromStorage();

      const handleOnline = () => {
        setIsOnline(true);
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const updateStudentScoreRef = useRef(updateStudentScore);
  useEffect(() => {
    updateStudentScoreRef.current = updateStudentScore;
  }, [updateStudentScore]);

  // Flush queue to AppContext when online
  const flushSyncQueue = useCallback(() => {
    if (pendingQueue.length === 0) return;

    pendingQueue.forEach((item) => {
      updateStudentScoreRef.current(
        item.studentId,
        item.subjectId,
        item.classId,
        item.term,
        item.session,
        item.scores
      );
      try {
        localStorage.removeItem(item.key);
      } catch (e) {
        console.error('Failed clearing synced score:', e);
      }
    });

    setPendingQueue([]);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  }, [pendingQueue]);

  // Auto-sync when transitioning to online with items in queue
  useEffect(() => {
    if (isOnline && pendingQueue.length > 0) {
      flushSyncQueue();
    }
  }, [isOnline, pendingQueue.length, flushSyncQueue]);

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Pull all students offering this subject (spanning assigned form class & all other classes offering the subject)
  const classStudents = useMemo(() => {
    if (!selectedSubjectId) return [];
    if (selectedClassId === 'all') {
      const allowedClassIds = new Set(classesOfferingSubject.map((c) => c.id));
      return students.filter((s) => allowedClassIds.has(s.class_id));
    }
    return students.filter((s) => s.class_id === selectedClassId);
  }, [students, selectedClassId, selectedSubjectId, classesOfferingSubject]);

  const handleScoreInput = (
    studentId: string,
    studentClassId: string,
    field: 'ca1' | 'ca2' | 'exam',
    value: number
  ) => {
    const existing = results.find(
      (r) =>
        r.student_id === studentId &&
        r.subject_id === selectedSubjectId &&
        r.class_id === studentClassId &&
        r.term === selectedTerm &&
        r.session === session
    );

    const currentCa1 = existing?.ca1 ?? 0;
    const currentCa2 = existing?.ca2 ?? 0;
    const currentExam = existing?.exam ?? 0;

    const newScores = {
      ca1: field === 'ca1' ? value : currentCa1,
      ca2: field === 'ca2' ? value : currentCa2,
      exam: field === 'exam' ? value : currentExam,
    };

    // Scoped storage key: (class_id, subject_id, term, session) + student_id
    const storageKey = `${OFFLINE_STORAGE_PREFIX}${studentClassId}_${selectedSubjectId}_${selectedTerm}_${session}_${studentId}`;
    const queuePayload = {
      key: storageKey,
      studentId,
      subjectId: selectedSubjectId,
      classId: studentClassId,
      term: selectedTerm,
      session,
      scores: newScores,
      timestamp: new Date().toISOString(),
    };

    if (isOnline) {
      // Direct cloud update to AppContext
      updateStudentScore(
        studentId,
        selectedSubjectId,
        studentClassId,
        selectedTerm,
        session,
        newScores
      );
      // Clean up cache entry if it existed
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      setPendingQueue((prev) => prev.filter((p) => p.key !== storageKey));
    } else {
      // Offline mode: persist immediately to browser localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(queuePayload));
      } catch (e) {
        console.error('Error saving to offline score cache:', e);
      }
      setPendingQueue((prev) => {
        const withoutCurrent = prev.filter((p) => p.key !== storageKey);
        return [...withoutCurrent, queuePayload];
      });
    }
  };

  const handleSaveGrades = async () => {
    setIsSaving(true);
    try {
      if (!isOnline && pendingQueue.length > 0) {
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 3000);
        return;
      }

      if (isOnline) {
        // If there's an offline pending queue, flush it first
        if (pendingQueue.length > 0) {
          flushSyncQueue();
        }

        // Explicitly guarantee every student in the current view is saved to Supabase
        const savePromises = classStudents.map((std) => {
          const result = results.find(
            (r) =>
              r.student_id === std.id &&
              r.subject_id === selectedSubjectId &&
              r.class_id === std.class_id &&
              r.term === selectedTerm &&
              r.session === session
          );

          const ca1 = result?.ca1 ?? 0;
          const ca2 = result?.ca2 ?? 0;
          const exam = result?.exam ?? 0;

          return updateStudentScore(
            std.id,
            selectedSubjectId,
            std.class_id,
            selectedTerm,
            session,
            { ca1, ca2, exam }
          );
        });

        await Promise.all(savePromises);
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 3000);
      } else {
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 3000);
      }
    } catch (err) {
      console.error('Error in handleSaveGrades:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentClassResults = results.filter((r) => {
    const isSubject = r.subject_id === selectedSubjectId && r.term === selectedTerm && r.session === session;
    if (!isSubject) return false;
    if (selectedClassId === 'all') {
      return classesOfferingSubject.some((c) => c.id === r.class_id);
    }
    return r.class_id === selectedClassId;
  });

  const totalScores = currentClassResults.map((r) => r.total_score);
  const classAverage =
    totalScores.length > 0
      ? (totalScores.reduce((a, b) => a + b, 0) / totalScores.length).toFixed(1)
      : '0.0';
  const highestScore = totalScores.length > 0 ? Math.max(...totalScores) : 0;
  const lowestScore = totalScores.length > 0 ? Math.min(...totalScores) : 0;
  const passCount = totalScores.filter((s) => s >= 50).length;
  const passRate =
    totalScores.length > 0 ? ((passCount / totalScores.length) * 100).toFixed(0) : '0';

  const formClassStudents = students.filter((s) => s.class_id === formClassId);
  const formClassSubjects = useMemo(() => {
    if (!formClass) return [];
    return filterSubjectsForClassAndStream(subjects, formClass).slice(0, 8);
  }, [formClass, subjects]);

  // MODULE 3: ZERO-LAG BROADSHEET CLIENT RENDERING WITH USEMEMO
  const broadsheetData = useMemo(() => {
    if (!formClass || formClassStudents.length === 0) {
      return {
        rows: [],
        classAverage: '0.0',
        totalStudents: 0,
        passingStudents: 0,
      };
    }

    // 1. Compute per-student totals, averages, grades for all subjects
    const unranked = formClassStudents.map((std) => {
      let totalAll = 0;
      let count = 0;

      const subjectScores = formClassSubjects.map((sub) => {
        const res = results.find(
          (r) =>
            r.student_id === std.id &&
            r.subject_id === sub.id &&
            r.class_id === formClass.id &&
            r.term === selectedTerm &&
            r.session === session
        );
        if (res) {
          totalAll += res.total_score;
          count++;
          return { subjectId: sub.id, score: res.total_score };
        }
        return { subjectId: sub.id, score: null };
      });

      const average = count > 0 ? Number((totalAll / count).toFixed(1)) : 0;
      const { grade, remarks } = calculateGradeAndRemark(average);
      const isGoodStanding = count > 0 && average >= 50;

      return {
        student: std,
        subjectScores,
        totalAll,
        count,
        average,
        grade,
        remarks,
        isGoodStanding,
      };
    });

    // 2. Rank positions based on totalAll descending
    const sorted = [...unranked].sort((a, b) => b.totalAll - a.totalAll);

    // Compute dense/standard ranking
    let currentRank = 1;
    const rankedRows = sorted.map((row, index) => {
      if (index > 0 && row.totalAll < sorted[index - 1].totalAll) {
        currentRank = index + 1;
      }
      return {
        ...row,
        position: currentRank,
      };
    });

    // Compute class summary
    const overallTotal = rankedRows.reduce((acc, r) => acc + r.totalAll, 0);
    const overallCount = rankedRows.filter((r) => r.count > 0).length;
    const classAvg =
      overallCount > 0
        ? (rankedRows.reduce((acc, r) => acc + r.average, 0) / overallCount).toFixed(1)
        : '0.0';
    const passing = rankedRows.filter((r) => r.isGoodStanding).length;

    return {
      rows: rankedRows,
      classAverage: classAvg,
      totalStudents: rankedRows.length,
      passingStudents: passing,
    };
  }, [formClass, formClassStudents, formClassSubjects, results, selectedTerm, session]);

  // Phase 3: Today's Attendance Record for Current Teacher (client-hydrated date)
  const [clientTodayStr, setClientTodayStr] = useState<string>('');
  const [clientDateFormatted, setClientDateFormatted] = useState<string>('Today');

  useEffect(() => {
    const now = new Date();
    setClientTodayStr(now.toISOString().split('T')[0]);
    setClientDateFormatted(
      now.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    );
  }, []);

  const teacherId = currentUser?.teacher_id || loggedTeacher?.id || currentUser?.id || '';

  const todayAttendance = useMemo(() => {
    if (!clientTodayStr) return null;
    return staffAttendance.find(
      (a) =>
        (a.teacher_id === teacherId || a.teacher_name === teacherName) &&
        a.created_at.startsWith(clientTodayStr)
    ) || null;
  }, [staffAttendance, teacherId, teacherName, clientTodayStr]);

  // Handle direct tap on "Clock In via Gate QR":
  // Immediately request browser GPS permission before opening camera scanner
  const handleStartClockInFlow = () => {
    setAttendanceNotice(null);

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      // Step 1: High-accuracy GPS request
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCachedCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setIsScannerOpen(true);
        },
        (err) => {
          console.warn('High-accuracy GPS attempt failed/timed out, retrying with fallback:', err);
          // Step 2: Fallback request (cell tower / Wi-Fi) with relaxed timeout & maximumAge
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              setCachedCoords({
                latitude: fallbackPos.coords.latitude,
                longitude: fallbackPos.coords.longitude,
              });
              setIsScannerOpen(true);
            },
            (fallbackErr) => {
              console.warn('Fallback geolocation failed/denied:', fallbackErr);
              // Do not block the teacher: open camera anyway to scan printed gate poster
              setCachedCoords(null);
              setIsScannerOpen(true);
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
      );
    } else {
      setCachedCoords(null);
      setIsScannerOpen(true);
    }
  };

  const handleScanSuccess = async (scannedPayload: string) => {
    setIsScannerOpen(false);
    setIsClockingIn(true);
    setAttendanceNotice(null);

    const executeClockIn = async (coords?: { latitude: number; longitude: number } | null) => {
      try {
        const res = await clockInStaff({
          scannedPayload,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        });

        if (res.success) {
          setAttendanceNotice({
            type: 'success',
            message: res.message || 'Clock-in recorded successfully!',
          });
        } else {
          setAttendanceNotice({
            type: 'error',
            message: res.message || 'Clock-in failed. Please scan the valid school gate QR.',
          });
        }
      } catch (err: any) {
        setAttendanceNotice({
          type: 'error',
          message: err?.message || 'Error clocking in. Check network connection.',
        });
      } finally {
        setIsClockingIn(false);
      }
    };

    // Use cached coordinates if already acquired during initial button tap
    if (cachedCoords) {
      await executeClockIn(cachedCoords);
      return;
    }

    // Secondary attempt if not yet resolved
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setCachedCoords(coords);
          executeClockIn(coords);
        },
        () => {
          // Fallback attempt
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              const coords = { latitude: fallbackPos.coords.latitude, longitude: fallbackPos.coords.longitude };
              setCachedCoords(coords);
              executeClockIn(coords);
            },
            () => {
              // Proceed with scan verification even if GPS unavailable
              executeClockIn(null);
            },
            { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 15000 }
      );
    } else {
      executeClockIn(null);
    }
  };

  const handleClockOut = async () => {
    if (!todayAttendance) return;
    setIsClockingOut(true);
    setAttendanceNotice(null);

    try {
      const res = await clockOutStaff(todayAttendance.id);
      if (res.success) {
        setAttendanceNotice({
          type: 'success',
          message: res.message || 'Clocked out successfully.',
        });
      } else {
        setAttendanceNotice({
          type: 'error',
          message: res.message || 'Failed to record clock-out.',
        });
      }
    } catch (err: any) {
      setAttendanceNotice({
        type: 'error',
        message: err?.message || 'Failed to record clock-out.',
      });
    } finally {
      setIsClockingOut(false);
    }
  };

  // Phase 4: Gate Security Safe Pick-Up Verification
  const handleVerifyPassCode = async (codeToVerify?: string) => {
    const raw = (codeToVerify || pickupInputCode).trim();
    if (!raw) {
      setGateNotice({
        type: 'error',
        message: 'Please enter the 6-digit OTP or scan a pickup QR code.',
      });
      return;
    }

    setIsVerifyingPass(true);
    setGateNotice(null);

    try {
      const res = await verifyAndHandoverPass({
        codeOrToken: raw,
        verifiedByStaffId: currentUser?.id,
      });

      if (res.success && res.pass) {
        setVerifiedPassResult({
          pass: res.pass,
          student: res.student,
        });
        setGateNotice({
          type: 'success',
          message: `Child Handover Confirmed! Verified by ${currentUser?.full_name || 'Staff'}.`,
        });
        setPickupInputCode('');
      } else {
        setVerifiedPassResult(null);
        setGateNotice({
          type: 'error',
          message: res.error || 'Invalid or expired pick-up authorization code.',
          reason: res.reason,
        });
      }
    } catch (e: any) {
      setVerifiedPassResult(null);
      setGateNotice({
        type: 'error',
        message: e?.message || 'Error occurred during verification.',
      });
    } finally {
      setIsVerifyingPass(false);
    }
  };

  const handlePassScanSuccess = (scannedPayload: string) => {
    setIsPassScannerOpen(false);
    handleVerifyPassCode(scannedPayload);
  };

  // Today's handovers verified in this school
  const todayHandovers = useMemo(() => {
    return pickupPasses.filter(
      (p) => p.status === 'USED' && p.picked_up_at && p.picked_up_at.startsWith(clientTodayStr || new Date().toISOString().split('T')[0])
    );
  }, [pickupPasses, clientTodayStr]);

  // Phase: Detect if current scope is Early Years (Creche, Playgroup, KG, Nursery)
  const isTargetEarlyYears = useMemo(() => {
    if (selectedClassId !== 'all') {
      return isEarlyYearsClass(currentClass);
    }
    // If all classes selected, check if all classes offering subject are early years
    return classesOfferingSubject.length > 0 && classesOfferingSubject.every((c) => isEarlyYearsClass(c));
  }, [selectedClassId, currentClass, classesOfferingSubject]);

  // Initialize and read existing early years commentary from results
  useEffect(() => {
    const map: Record<string, EarlyYearsCommentary> = {};
    classStudents.forEach((std) => {
      const match = results.find(
        (r) =>
          r.student_id === std.id &&
          r.term === selectedTerm &&
          r.session === session &&
          r.early_years_data
      );
      if (match?.early_years_data) {
        map[std.id] = match.early_years_data;
      } else {
        map[std.id] = {
          ratings: {
            language_phonics: 'Developing',
            early_numeracy: 'Developing',
            motor_skills: 'Proficient',
            social_emotional: 'Proficient',
            hygiene_health: 'Proficient',
          },
          narrative_observation: '',
        };
      }
    });
    setEyPupilComments(map);
  }, [classStudents, results, selectedTerm, session]);

  const handleEyRatingChange = (
    studentId: string,
    domain: keyof EarlyYearsDomainRatings,
    level: EarlyYearsMastery
  ) => {
    setEyPupilComments((prev) => {
      const curr = prev[studentId] || {
        ratings: {
          language_phonics: 'Developing',
          early_numeracy: 'Developing',
          motor_skills: 'Proficient',
          social_emotional: 'Proficient',
          hygiene_health: 'Proficient',
        },
        narrative_observation: '',
      };
      return {
        ...prev,
        [studentId]: {
          ...curr,
          ratings: {
            ...curr.ratings,
            [domain]: level,
          },
        },
      };
    });
  };

  const handleEyCommentChange = (studentId: string, text: string) => {
    setEyPupilComments((prev) => {
      const curr = prev[studentId] || {
        ratings: {
          language_phonics: 'Developing',
          early_numeracy: 'Developing',
          motor_skills: 'Proficient',
          social_emotional: 'Proficient',
          hygiene_health: 'Proficient',
        },
        narrative_observation: '',
      };
      return {
        ...prev,
        [studentId]: {
          ...curr,
          narrative_observation: text,
        },
      };
    });
  };

  const applyEyTemplateComment = (studentId: string, pupilName: string, template: string) => {
    const firstName = pupilName.split(' ')[0] || 'Pupil';
    const customized = template.replace(/\[Name\]/g, firstName);
    handleEyCommentChange(studentId, customized);
  };

  const handleSaveEarlyYearsCommentary = async (studentId: string, studentClassId: string) => {
    const commentData = eyPupilComments[studentId];
    if (!commentData) return;

    setEySavingNotice('Saving developmental observation...');
    try {
      const res = await updateEarlyYearsCommentary(
        studentId,
        studentClassId,
        selectedTerm,
        session,
        commentData
      );

      if (res.success) {
        setEySavingNotice(`Saved observation for ${students.find((s) => s.id === studentId)?.full_name || 'pupil'}!`);
        setTimeout(() => setEySavingNotice(null), 3000);
      } else {
        setEySavingNotice(`Save error: ${res.error || 'Failed'}`);
        setTimeout(() => setEySavingNotice(null), 3000);
      }
    } catch {
      setEySavingNotice('Error saving developmental report.');
      setTimeout(() => setEySavingNotice(null), 3000);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-700 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-5 py-3 rounded-lg shadow-xs">
          <RefreshCw className="w-5 h-5 text-[#1D4ED8] animate-spin" />
          <span className="text-sm font-medium text-slate-700">Synchronizing Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] p-4 sm:p-6 lg:p-8">
      <AnimatedContent distance={100} direction="vertical" duration={0.8} ease="power3.out" blur={0} stagger={0.08} threshold={0.1}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-[#1D4ED8] text-xs font-semibold uppercase tracking-wider mb-1">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>Nigerian Curriculum & Examination Matrix (WAEC / NECO Standards)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Faculty Academic Hub
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Continuous Assessment (CA1: 20, CA2: 20, Exam: 60 = 100) • Subject Grading & Form Broadsheet
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Offline Sync State Indicator */}
            {isOnline ? (
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Online • Synced to Cloud</span>
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                <WifiOff className="w-4 h-4 text-amber-400" />
                <span>Offline Mode • Saved to Local Cache ({pendingQueue.length} pending updates)</span>
              </span>
            )}

            {isOnline && pendingQueue.length > 0 && (
              <button
                onClick={flushSyncQueue}
                className="px-3 py-1.5 rounded-full bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Push queued scores to server"
              >
                <CloudUpload className="w-3.5 h-3.5 animate-bounce" />
                <span>Sync Now ({pendingQueue.length})</span>
              </button>
            )}

            <span className="px-3.5 py-1.5 rounded-full bg-white text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>Faculty: {teacherName}</span>
            </span>

            {formClass && (
              <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Form Teacher: {formClass.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Phase 3: Daily Geofenced QR Clock-In / Out Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Daily Faculty Attendance & Campus Clock-In
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {clientDateFormatted}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scan the printable campus gate/staffroom QR poster with your camera. GPS geofence ({currentSchool?.geofence_radius_meters || 150}m) verifies your physical arrival.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!todayAttendance ? (
                <button
                  type="button"
                  onClick={handleStartClockInFlow}
                  disabled={isClockingIn}
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isClockingIn ? 'Verifying Attendance...' : 'Clock In via Gate QR'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        todayAttendance.status === 'PRESENT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {todayAttendance.status === 'PRESENT' ? 'Present (On Time)' : 'Late Arrival'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      In: {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {todayAttendance.distance_meters !== null && todayAttendance.distance_meters !== undefined && (
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {todayAttendance.distance_meters}m
                      </span>
                    )}
                  </div>

                  {!todayAttendance.clock_out_time ? (
                    <button
                      type="button"
                      onClick={handleClockOut}
                      disabled={isClockingOut}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isClockingOut ? 'Recording...' : 'Clock Out'}</span>
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
                      Out: {new Date(todayAttendance.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {attendanceNotice && (
            <div
              className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 border ${
                attendanceNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {attendanceNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{attendanceNotice.message}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('entry')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'entry'
                ? 'border-[#1D4ED8] text-[#1D4ED8] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Subject Score Entry Grid</span>
          </button>

          {formClass && (
            <button
              onClick={() => setActiveTab('form_roster')}
              className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'form_roster'
                  ? 'border-[#1D4ED8] text-[#1D4ED8] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Form Class Broadsheet ({formClass.name})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('pickup_gate')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pickup_gate'
                ? 'border-[#1D4ED8] text-[#1D4ED8] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Safe Pick-Up Gate Verification</span>
          </button>

          <button
            onClick={() => setActiveTab('enroll_student')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'enroll_student'
                ? 'border-[#1D4ED8] text-[#1D4ED8] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Form Teacher Dual Enrollment</span>
          </button>
        </div>

        {/* TAB 1: SCORE ENTRY */}
        {activeTab === 'entry' && (
          <div className="space-y-6">
            {/* Filter Controls Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Grading Subject (NERDC):</span>
                  {currentUser?.role === 'teacher' && (
                    <span className="text-[10px] text-amber-400 font-mono">Assigned</span>
                  )}
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent cursor-pointer"
                >
                  {teacherSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Target Class / Scope:</span>
                  {currentClass?.stage === 'senior_secondary' && (
                    <span className="text-[10px] text-amber-400 uppercase font-bold">
                      Stream: {getSeniorStreamForClass(currentClass)}
                    </span>
                  )}
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent cursor-pointer"
                >
                  <option value="all">
                    ⭐ All Classes & Arms Offering {currentSubject?.name || 'Subject'} ({classesOfferingSubject.length} Arms)
                  </option>
                  {classesOfferingSubject.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.session})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Term:
                </label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent cursor-pointer"
                >
                  <option value="1st Term">1st Term</option>
                  <option value="2nd Term">2nd Term</option>
                  <option value="3rd Term">3rd Term</option>
                </select>
              </div>
            </div>

            {/* Early Years Developmental Rubric (Creche, Playgroup, KG, Nursery) vs Numeric Grid */}
            {isTargetEarlyYears ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Early Childhood Developmental Rubric Active</span>
                    </div>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Numeric CA1/CA2/Exam (100) scoring is disabled for Early Years ({selectedClassId === 'all' ? 'Creche / KG / Nursery' : currentClass?.name}). Assess developmental milestones across 5 standard early-learning domains with descriptive narrative feedback.
                    </p>
                  </div>
                  {eySavingNotice && (
                    <span className="text-xs font-semibold text-emerald-700 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                      {eySavingNotice}
                    </span>
                  )}
                </div>

                {classStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic bg-white border border-slate-200 rounded-xl">
                    No pupils currently enrolled in {currentClass?.name || 'this Early Years class'}.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {classStudents.map((std) => {
                      const studentClass = classes.find((c) => c.id === std.class_id);
                      const pupilData = eyPupilComments[std.id] || {
                        ratings: {
                          language_phonics: 'Developing',
                          early_numeracy: 'Developing',
                          motor_skills: 'Proficient',
                          social_emotional: 'Proficient',
                          hygiene_health: 'Proficient',
                        },
                        narrative_observation: '',
                      };

                      const domains: { key: keyof EarlyYearsDomainRatings; label: string; desc: string }[] = [
                        { key: 'language_phonics', label: 'Language, Phonics & Communication', desc: 'Letter sounds, oral expression & circle-time speech' },
                        { key: 'early_numeracy', label: 'Early Numeracy & Cognitive Recognition', desc: 'Number identification, counting, shapes & colors' },
                        { key: 'motor_skills', label: 'Fine & Gross Motor Skills', desc: 'Pencil grip, scissors, coloring, running & physical balance' },
                        { key: 'social_emotional', label: 'Social, Emotional & Play Interaction', desc: 'Sharing, peer cooperation, self-regulation & empathy' },
                        { key: 'hygiene_health', label: 'Personal Hygiene & Health Habits', desc: 'Handwashing, eating manners & classroom tidiness' },
                      ];

                      const levels: EarlyYearsMastery[] = ['Emerging', 'Developing', 'Proficient', 'Mastered'];

                      return (
                        <div
                          key={std.id}
                          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs transition hover:border-slate-300 space-y-4"
                        >
                          {/* Pupil Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm border border-amber-200">
                                {std.full_name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{std.full_name}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                  <span>{std.reg_number}</span>
                                  <span>•</span>
                                  <span className="text-amber-700 font-medium">
                                    {studentClass?.name || std.class_grade || 'Early Years'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSaveEarlyYearsCommentary(std.id, std.class_id)}
                              className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <Save className="w-3.5 h-3.5 text-amber-400" />
                              <span>Save Observation</span>
                            </button>
                          </div>

                          {/* 5 Developmental Domains */}
                          <div className="space-y-3 pt-1">
                            <div className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                              Developmental Milestones & Rubric
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {domains.map((dom) => {
                                const currentLevel = pupilData.ratings[dom.key];
                                return (
                                  <div
                                    key={dom.key}
                                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                                  >
                                    <div>
                                      <p className="text-xs font-bold text-slate-900 leading-snug">{dom.label}</p>
                                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{dom.desc}</p>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 mt-3">
                                      {levels.map((lvl) => {
                                        const isSelected = currentLevel === lvl;
                                        return (
                                          <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => handleEyRatingChange(std.id, dom.key, lvl)}
                                            className={`py-1 text-[10px] font-bold rounded transition text-center cursor-pointer ${
                                              isSelected
                                                ? lvl === 'Mastered'
                                                  ? 'bg-emerald-600 text-white shadow-xs'
                                                  : lvl === 'Proficient'
                                                  ? 'bg-blue-600 text-white shadow-xs'
                                                  : lvl === 'Developing'
                                                  ? 'bg-amber-500 text-white shadow-xs'
                                                  : 'bg-purple-600 text-white shadow-xs'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                            }`}
                                          >
                                            {lvl}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Form Teacher Narrative Observation */}
                          <div className="space-y-2 pt-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <span>Form Teacher Narrative Observation</span>
                                <span className="text-[10px] text-slate-400 font-normal">(Printed on Report Card)</span>
                              </label>

                              {/* Quick Nigerian Comment Templates */}
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] text-slate-500 font-semibold mr-1">Quick Templates:</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    applyEyTemplateComment(
                                      std.id,
                                      std.full_name,
                                      '[Name] has shown remarkable enthusiasm in phonics and early numeracy. Demonstrates excellent fine motor control and interacts warmly with peers during circle play.'
                                    )
                                  }
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                                  title="Phonics & Circle Play"
                                >
                                  ✨ Phonics & Play
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    applyEyTemplateComment(
                                      std.id,
                                      std.full_name,
                                      '[Name] is steadily developing letter-sound recognition and number concepts. Active and enthusiastic in outdoor activities; encourages cooperative play.'
                                    )
                                  }
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                                  title="Sound Recognition & Outdoor"
                                >
                                  🌱 Sound & Outdoor
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    applyEyTemplateComment(
                                      std.id,
                                      std.full_name,
                                      '[Name] displays outstanding social manners and personal hygiene. Shows creative flair in coloring and storytelling sessions.'
                                    )
                                  }
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                                  title="Manners & Creativity"
                                >
                                  🎨 Manners & Art
                                </button>
                              </div>
                            </div>

                            <textarea
                              rows={3}
                              value={pupilData.narrative_observation}
                              onChange={(e) => handleEyCommentChange(std.id, e.target.value)}
                              placeholder={`Enter detailed teacher remarks for ${std.full_name} (e.g. phonics progress, circle time engagement, motor milestones)...`}
                              className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent transition"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Enrolled in Subject</span>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{classStudents.length}</p>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Subject Average</span>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{classAverage}%</p>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Highest / Lowest</span>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {highestScore}% <span className="text-xs text-gray-500">/ {lowestScore}%</span>
                </p>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Pass Rate (≥50%)</span>
                <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">{passRate}%</p>
              </div>
            </div>

            {/* Spreadsheet-Like Score Entry Grid */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {currentSubject?.name} — {selectedClassId === 'all' ? 'All Classes Offering Subject' : currentClass?.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter scores: CA1 (Max 20) + CA2 (Max 20) + Terminal Exam (Max 60) = 100%
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!isOnline && (
                    <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800">
                      <WifiOff className="w-3.5 h-3.5" /> Offline Mode Active
                    </span>
                  )}
                  {saveToast && (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> {isOnline ? 'Scores Saved' : 'Saved to Offline Cache'}
                    </span>
                  )}
                  <button
                    onClick={handleSaveGrades}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 text-amber-400" />
                    )}
                    <span>{isSaving ? 'Saving...' : isOnline ? 'Save Grades' : 'Cache Offline'}</span>
                  </button>
                </div>
              </div>

              {classStudents.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs italic">
                  No students currently found offering {currentSubject?.name || 'this subject'}.
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Student Name</th>
                          <th className="px-4 py-3">Class / Arm</th>
                          <th className="px-4 py-3">Reg Number</th>
                          <th className="px-4 py-3 text-center">CA 1 (20)</th>
                          <th className="px-4 py-3 text-center">CA 2 (20)</th>
                          <th className="px-4 py-3 text-center">Exam (60)</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-900">Total (100)</th>
                          <th className="px-4 py-3 text-center">Grade</th>
                          <th className="px-4 py-3">Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.map((std) => {
                          const result = results.find(
                            (r) =>
                              r.student_id === std.id &&
                              r.subject_id === selectedSubjectId &&
                              r.class_id === std.class_id &&
                              r.term === selectedTerm &&
                              r.session === session
                          );

                          const ca1 = result?.ca1 ?? 0;
                          const ca2 = result?.ca2 ?? 0;
                          const exam = result?.exam ?? 0;
                          const total = ca1 + ca2 + exam;
                          const { grade, remarks: remark } = calculateGradeAndRemark(total);

                          const gradeBadge =
                            grade === 'A'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                              : grade === 'B'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                              : grade === 'C'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200 font-bold'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 font-bold';

                          const studentClass = classes.find((c) => c.id === std.class_id);

                          return (
                            <tr key={std.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-4 py-3 font-semibold text-slate-900">{std.full_name}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-600">
                                  {studentClass?.name || std.class_grade || 'Class'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono tabular-nums text-slate-500">{std.reg_number}</td>

                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={ca1}
                                  onChange={(e) => handleScoreInput(std.id, std.class_id, 'ca1', Number(e.target.value))}
                                  className="w-16 bg-white border border-slate-300 rounded-md py-1.5 px-2 text-center font-mono tabular-nums font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent"
                                />
                              </td>

                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={ca2}
                                  onChange={(e) => handleScoreInput(std.id, std.class_id, 'ca2', Number(e.target.value))}
                                  className="w-16 bg-white border border-slate-300 rounded-md py-1.5 px-2 text-center font-mono tabular-nums font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent"
                                />
                              </td>

                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="60"
                                  value={exam}
                                  onChange={(e) => handleScoreInput(std.id, std.class_id, 'exam', Number(e.target.value))}
                                  className="w-20 bg-white border border-slate-300 rounded-md py-1.5 px-2 text-center font-mono tabular-nums font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent"
                                />
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className="font-mono tabular-nums font-extrabold text-sm text-slate-900">{total}</span>
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-md font-mono font-bold text-xs ${gradeBadge}`}>
                                  {grade}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-slate-500 text-xs">{remark}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Score Card View */}
                  <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-4">
                    {classStudents.map((std) => {
                      const result = results.find(
                        (r) =>
                          r.student_id === std.id &&
                          r.subject_id === selectedSubjectId &&
                          r.class_id === std.class_id &&
                          r.term === selectedTerm &&
                          r.session === session
                      );

                      const ca1 = result?.ca1 ?? 0;
                      const ca2 = result?.ca2 ?? 0;
                      const exam = result?.exam ?? 0;
                      const total = ca1 + ca2 + exam;
                      const { grade, remarks: remark } = calculateGradeAndRemark(total);

                      const gradeBadge =
                        grade === 'A'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                          : grade === 'B'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                          : grade === 'C'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200 font-bold'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 font-bold';

                      const studentClass = classes.find((c) => c.id === std.class_id);

                      return (
                        <div key={std.id} className="pt-3 first:pt-0 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{std.full_name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400 font-mono">{std.reg_number}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  {studentClass?.name || std.class_grade || 'Class'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-base text-slate-900 mr-2">{total}%</span>
                              <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] ${gradeBadge}`}>
                                {grade}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <div>
                              <label className="block text-[10px] text-slate-600 font-medium mb-1">CA 1 (20)</label>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={ca1}
                                onChange={(e) => handleScoreInput(std.id, std.class_id, 'ca1', Number(e.target.value))}
                                className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-2 text-center font-mono font-semibold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-600 font-medium mb-1">CA 2 (20)</label>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={ca2}
                                onChange={(e) => handleScoreInput(std.id, std.class_id, 'ca2', Number(e.target.value))}
                                className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-2 text-center font-mono font-semibold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-600 font-medium mb-1">Exam (60)</label>
                              <input
                                type="number"
                                min="0"
                                max="60"
                                value={exam}
                                onChange={(e) => handleScoreInput(std.id, std.class_id, 'exam', Number(e.target.value))}
                                className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-2 text-center font-mono font-semibold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              />
                            </div>
                          </div>
                          <div className="text-[11px] text-gray-400 italic flex items-center justify-between px-1">
                            <span>Remark: {remark}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* WAEC / NECO Standards Guide */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-gray-200 font-semibold">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <span>WAEC / NECO Official Assessment Key:</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
                <span><strong className="text-emerald-400">A1</strong> (75 - 100%): Distinction</span>
                <span><strong className="text-amber-400">B2/B3</strong> (65 - 74%): Very Good</span>
                <span><strong className="text-gray-300">C4-C6</strong> (50 - 64%): Credit</span>
                <span><strong className="text-rose-400">P7/P8</strong> (40 - 49%): Pass</span>
                <span><strong className="text-rose-500">F9</strong> (0 - 39%): Fail</span>
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: BROADSHEET */}
        {activeTab === 'form_roster' && formClass && (
          <div className="space-y-6">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                  <span>Master Broadsheet: {formClass.name}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Form Teacher terminal score overview across all subjects taught to your class • Zero-lag client-rendered.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-emerald-400 font-mono bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800">
                  Class Avg: {broadsheetData.classAverage}% ({broadsheetData.passingStudents}/{broadsheetData.totalStudents} passing)
                </span>
                <span className="text-xs text-slate-700 font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  Session: {session} • Term: {selectedTerm}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="px-3 py-3 text-center w-12">Pos</th>
                      <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10">Student</th>
                      <th className="px-4 py-3">Reg No</th>
                      {formClassSubjects.map((sub) => (
                        <th key={sub.id} className="px-3 py-3 text-center whitespace-nowrap">
                          {sub.code}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center font-semibold text-slate-900">Total Score</th>
                      <th className="px-4 py-3 text-center font-bold text-amber-400">Average %</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-300">Grade</th>
                      <th className="px-4 py-3 text-center">Standing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {broadsheetData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={formClassSubjects.length + 7} className="text-center py-8 text-gray-400 italic">
                          No students in your form class yet.
                        </td>
                      </tr>
                    ) : (
                      broadsheetData.rows.map((row) => {
                        const gradeBadge =
                          row.grade === 'A'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                            : row.grade === 'B'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                            : row.grade === 'C'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200 font-bold'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 font-bold';

                        return (
                          <tr key={row.student.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-3 py-3 text-center font-mono font-bold text-gray-300">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                                row.position === 1
                                  ? 'bg-amber-100 text-amber-800 font-extrabold border border-amber-300'
                                  : row.position === 2
                                  ? 'bg-slate-200 text-slate-800 font-bold border border-slate-300'
                                  : row.position === 3
                                  ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                                  : 'text-gray-400'
                              }`}>
                                {row.position}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900 sticky left-0 bg-white z-10">
                              {row.student.full_name}
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-slate-500">{row.student.reg_number}</td>

                            {row.subjectScores.map((scoreItem) => (
                              <td key={scoreItem.subjectId} className="px-3 py-3 text-center font-mono text-gray-300">
                                {scoreItem.score !== null ? scoreItem.score : '—'}
                              </td>
                            ))}

                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">{row.totalAll}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-amber-400">
                              {row.count > 0 ? `${row.average}%` : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] ${gradeBadge}`}>
                                {row.count > 0 ? row.grade : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  row.isGoodStanding
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                                }`}
                              >
                                {row.count > 0 ? (row.isGoodStanding ? 'Good Standing' : 'At Risk') : 'No Scores'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SAFE PICK-UP GATE VERIFICATION (PHASE 4) */}
        {activeTab === 'pickup_gate' && (
          <div className="space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Dismissal Security & Child Handover Terminal</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Gate Safe Pick-Up Verification
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify the collector&apos;s 6-digit numeric OTP or scan their QR token voucher before releasing any student.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPassScannerOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>Scan Collector QR Voucher</span>
                </button>
              </div>
            </div>

            {/* Verification Keypad / Input Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-xl mx-auto space-y-4">
              <h3 className="text-sm font-bold text-slate-900 text-center">
                Enter Collector 6-Digit Gate Pass OTP
              </h3>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 482910"
                  value={pickupInputCode}
                  onChange={(e) => setPickupInputCode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-2xl font-mono font-black text-center tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => handleVerifyPassCode()}
                  disabled={isVerifyingPass || pickupInputCode.length < 6}
                  className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-40"
                >
                  {isVerifyingPass ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>

              {gateNotice && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                    gateNotice.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {gateNotice.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className="font-bold block">
                      {gateNotice.type === 'success' ? 'Verification Passed' : 'Verification Rejected'}
                    </span>
                    <span>{gateNotice.message}</span>
                  </div>
                </div>
              )}

              {/* Verified Pass Success Confirmation Card */}
              {verifiedPassResult && (
                <div className="mt-4 p-5 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
                      <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wide">
                        Authorized Handover Match
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Code: {verifiedPassResult.pass.otp_code}
                    </span>
                  </div>

                  {/* Student & Collector Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Student Released:</span>
                      <strong className="text-sm text-slate-900 block mt-0.5">
                        {verifiedPassResult.student?.full_name || 'Enrolled Student'}
                      </strong>
                      <span className="text-slate-600 text-[11px]">
                        Class: {verifiedPassResult.student?.class_grade || 'Primary / Secondary'}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Authorized Collector:</span>
                      <strong className="text-sm text-slate-900 block mt-0.5">
                        {verifiedPassResult.pass.delegate_name || 'Registered Parent / Guardian'}
                      </strong>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                        verifiedPassResult.pass.pass_type === 'DAILY_PARENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {verifiedPassResult.pass.pass_type === 'DAILY_PARENT' ? 'Verified Parent' : '5-Hour Delegate'}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-100/70 text-emerald-900 text-[11px] text-center font-medium">
                    Status has been marked as <strong>USED</strong>. This pass cannot be reused.
                  </div>
                </div>
              )}
            </div>

            {/* Today's Completed Gate Handovers Roll */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>Today&apos;s Completed Child Handovers</span>
                <span className="font-mono text-slate-400 font-normal">{todayHandovers.length} Completed</span>
              </h3>

              {todayHandovers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  No student handovers completed yet today.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2">Student</th>
                        <th className="px-3.5 py-2">Collector Full Name</th>
                        <th className="px-3.5 py-2">Collector Type</th>
                        <th className="px-3.5 py-2">OTP Code</th>
                        <th className="px-3.5 py-2">Handover Time</th>
                        <th className="px-3.5 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {todayHandovers.map((h) => {
                        const std = students.find((s) => s.id === h.student_id);
                        return (
                          <tr key={h.id} className="hover:bg-slate-50/50">
                            <td className="px-3.5 py-2.5 font-bold text-slate-900">
                              {std?.full_name || 'Student'} ({std?.class_grade || 'Class'})
                            </td>
                            <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                              {h.delegate_name || 'Registered Parent'}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                h.pass_type === 'DAILY_PARENT'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {h.pass_type === 'DAILY_PARENT' ? 'Parent' : 'Delegate'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 font-mono text-slate-600">{h.otp_code}</td>
                            <td className="px-3.5 py-2.5 text-slate-500 font-mono">
                              {h.picked_up_at
                                ? new Date(h.picked_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Completed'}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Released & Verified
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: DUAL ENROLLMENT */}
        {activeTab === 'enroll_student' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <EnrollStudentForm
              defaultClassId={formClassId}
              defaultEnrolledByRole="Form Teacher"
              defaultEnrolledByName={teacherName}
              title={`Form Teacher Enrollment: ${formClass?.name || 'Assigned Class'}`}
              description="Register new students directly into your form class. Records are watermarked with your staff name and date for Bursar audit."
            />
          </div>
        )}

        {/* Phase 3: Staff Attendance Scanner Modal */}
        <StaffAttendanceScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />

        {/* Phase 4: Pick-Up Pass Scanner Modal */}
        <StaffAttendanceScannerModal
          isOpen={isPassScannerOpen}
          onClose={() => setIsPassScannerOpen(false)}
          onScanSuccess={handlePassScanSuccess}
        />
      </div>
          </AnimatedContent>
    </div>
  );
}
