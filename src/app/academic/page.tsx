'use client';

import { AnimatedContent } from '@/components/AnimatedContent';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatNaira, calculateGradeAndRemark } from '@/types';
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
} from 'lucide-react';

export default function AcademicHubPage() {
  const router = useRouter();
  const {
    schoolInfo,
    classes = [],
    subjects = [],
    teachers = [],
    students = [],
    results = [],
    updateStudentScore,
    currentUser,
    isAuthReady,
  } = useApp();

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

  const [activeTab, setActiveTab] = useState<'entry' | 'form_roster' | 'enroll_student'>('entry');

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
                          <th className="px-4 py-3 text-center font-bold text-gray-100">Total (100)</th>
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
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-900 text-amber-300 border border-gray-700">
                                  {studentClass?.name || std.class_grade || 'Class'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-black text-base text-gray-100 mr-2">{total}%</span>
                              <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] ${gradeBadge}`}>
                                {grade}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-gray-700/70">
                            <div>
                              <label className="block text-[10px] text-gray-400 font-medium mb-1">CA 1 (20)</label>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={ca1}
                                onChange={(e) => handleScoreInput(std.id, std.class_id, 'ca1', Number(e.target.value))}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg py-1 px-2 text-center font-mono font-bold text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 font-medium mb-1">CA 2 (20)</label>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={ca2}
                                onChange={(e) => handleScoreInput(std.id, std.class_id, 'ca2', Number(e.target.value))}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg py-1 px-2 text-center font-mono font-bold text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 font-medium mb-1">Exam (60)</label>
                              <input
                                type="number"
                                min="0"
                                max="60"
                                value={exam}
                                onChange={(e) => handleScoreInput(std.id, std.class_id, 'exam', Number(e.target.value))}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg py-1 px-2 text-center font-mono font-bold text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                <span className="text-xs text-gray-300 font-mono bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
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
                      <th className="px-4 py-3 text-center font-bold text-gray-100">Total Score</th>
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

                            <td className="px-4 py-3 text-center font-mono font-extrabold text-gray-100">{row.totalAll}</td>
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

        {/* TAB 3: DUAL ENROLLMENT */}
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
      </div>
          </AnimatedContent>
    </div>
  );
}
