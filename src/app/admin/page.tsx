'use client';

import { AnimatedContent } from '@/components/AnimatedContent';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { StudentProfile, formatNaira } from '@/types';
import { supabase } from '@/lib/supabase';
import TeacherRegistry from '@/components/TeacherRegistry';
import EnrollStudentForm from '@/components/EnrollStudentForm';
import StaffAttendanceQROverlay from '@/components/StaffAttendanceQROverlay';
import {
  Shield,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Plus,
  Users,
  GraduationCap,
  KeyRound,
  UserCheck,
  UserPlus,
  Send,
  Building2,
  Copy,
  Check,
  PieChart,
  Receipt,
  Eye,
  X,
  Clock,
  ChevronDown,
  Lock,
  Search,
  BookOpen,
  Award,
  Sparkles,
  Printer,
  Download,
  FileText,
  QrCode,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function AdminHubPage() {
  const router = useRouter();
  const {
    schoolInfo,
    currentSchool,
    classes = [],
    subjects = [],
    students = [],
    teachers = [],
    receipts = [],
    transactions = [],
    invoices = [],
    promoteClass,
    addAnnouncement,
    toggleStudentFeeStatus,
    approveReceipt,
    confirmPartialPayment,
    rejectReceipt,
    getStudentTermLedger,
    resultsPublished,
    toggleResultsPublished,
    results = [],
    updateAdminPassword,
    staffAttendance = [],
    updateSchoolGeofence,
    currentUser,
    isAuthReady,
  } = useApp();

  // Route Guard: Require admin / bursar authentication
  useEffect(() => {
    if (!isAuthReady) return;
    if (!currentUser) {
      router.push('/login');
    } else if (currentUser.role === 'student') {
      router.push('/student-hub');
    } else if (currentUser.role === 'teacher') {
      router.push('/academic-hub');
    }
  }, [currentUser, isAuthReady, router]);

  // Clean Realtime sync refresh using router.refresh() without infinite window.location.reload()
  useEffect(() => {
    const channel = supabase
      .channel('admin-hub-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const [activeTab, setActiveTab] = useState<'roster' | 'receipts' | 'ledger' | 'teachers' | 'enroll' | 'notices' | 'attendance' | 'admin-security'>('roster');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Admin Self-Service Password Security Form State
  const [adminCurrentPass, setAdminCurrentPass] = useState('');
  const [adminNewPass, setAdminNewPass] = useState('');
  const [adminConfirmPass, setAdminConfirmPass] = useState('');
  const [adminPassError, setAdminPassError] = useState<string | null>(null);
  const [adminPassSuccess, setAdminPassSuccess] = useState(false);

  // Master Student Search & Dossier Modal State
  const [masterSearchQuery, setMasterSearchQuery] = useState('');
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<StudentProfile | null>(null);

  // Administrative Gate Publish Results Confirmation Modal State
  const [isPublishConfirmModalOpen, setIsPublishConfirmModalOpen] = useState(false);
  const [publishToast, setPublishToast] = useState<string | null>(null);

  // Selected student for detailed debt & transaction history modal
  const [selectedStudentForLedger, setSelectedStudentForLedger] = useState<StudentProfile | null>(null);

  // Action modals from Receipt Queue
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [confirmFullModalReceipt, setConfirmFullModalReceipt] = useState<{
    id: string;
    studentName: string;
    term: string;
    amount: number;
    regNumber: string;
  } | null>(null);

  const [partialModalReceipt, setPartialModalReceipt] = useState<{
    id: string;
    studentId: string;
    studentName: string;
    term: string;
    regNumber: string;
    amountClaimed: number;
    totalTermFee: number;
    previousPaid: number;
    previousDebt: number;
    customApprovedAmount: number;
    newRemainingBalance: number;
  } | null>(null);

  const [rejectModalReceipt, setRejectModalReceipt] = useState<{
    id: string;
    studentName: string;
    regNumber: string;
    term: string;
  } | null>(null);
  const [customRejectNote, setCustomRejectNote] = useState('');

  // Promote Class Modal
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [fromClassId, setFromClassId] = useState(
    classes.find((c) => c.name === 'SS1 Arm A')?.id || classes[0]?.id || ''
  );
  const [toClassId, setToClassId] = useState(
    classes.find((c) => c.name === 'SS2 Arm A')?.id || classes[1]?.id || ''
  );
  const [promoteNotice, setPromoteNotice] = useState<{ success: boolean; message: string } | null>(null);

  // Announcement Form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [annSuccess, setAnnSuccess] = useState(false);

  // Class Filter for Roster
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Phase 3: Staff Attendance & Geofence State
  const [isQrPosterModalOpen, setIsQrPosterModalOpen] = useState(false);
  const [geofenceLat, setGeofenceLat] = useState<string>(currentSchool?.latitude?.toString() || '6.5244');
  const [geofenceLon, setGeofenceLon] = useState<string>(currentSchool?.longitude?.toString() || '3.3792');
  const [geofenceRadius, setGeofenceRadius] = useState<number>(currentSchool?.geofence_radius_meters || 75);
  const [resumptionCutoff, setResumptionCutoff] = useState<string>(currentSchool?.resumption_cutoff_time || '08:00');
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [geofenceSaveNotice, setGeofenceSaveNotice] = useState<string | null>(null);

  // Attendance Log Filters
  const [attendancePeriodFilter, setAttendancePeriodFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [attendanceTeacherFilter, setAttendanceTeacherFilter] = useState<string>('all');
  const [todayIsoDate, setTodayIsoDate] = useState<string>('');

  useEffect(() => {
    setTodayIsoDate(new Date().toISOString().split('T')[0]);
  }, []);

  const pendingReceiptsCount = receipts?.filter((r) => r.status === 'pending_verification').length || 0;
  const studentsInSourceClass = students.filter((s) => s.class_id === fromClassId);

  const filteredStudents = students.filter((s) => {
    const matchesClass = filterClassId === 'all' || s.class_id === filterClassId;
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.reg_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parent_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePromoteClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromClassId === toClassId) {
      setPromoteNotice({ success: false, message: 'Source and target class cannot be the same.' });
      return;
    }
    const result = promoteClass(fromClassId, toClassId);
    setPromoteNotice(result);
    if (result.success) {
      setTimeout(() => {
        setIsPromoteModalOpen(false);
        setPromoteNotice(null);
      }, 2500);
    }
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    addAnnouncement({
      title: annTitle,
      content: annContent,
      author_name: 'School Administrator',
      priority: annPriority,
    });
    setAnnTitle('');
    setAnnContent('');
    setAnnSuccess(true);
    setTimeout(() => setAnnSuccess(false), 3000);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-5 py-3 rounded-xl shadow-sm">
          <Clock className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-slate-700">Synchronizing Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" />
              <span>Nigerian Education Administration (33 Class Tiers: Creche – SS3 Arm F)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Admin Command Center</h1>
              {currentSchool?.invite_code && (
                <div
                  onClick={() => {
                    navigator.clipboard.writeText(currentSchool.invite_code);
                    setPublishToast(`Invite Code ${currentSchool.invite_code} copied!`);
                    setTimeout(() => setPublishToast(null), 3000);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold border border-slate-300 cursor-pointer transition shadow-xs"
                  title="Click to copy School Invite Code"
                >
                  <span>School Code: {currentSchool.invite_code}</span>
                  <Copy className="w-3 h-3 text-slate-500" />
                </div>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1">
              {schoolInfo.name} • Class progression across all 33 class arms, staff registry, admissions, and Naira fee oversight.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Global Results Release Gate Master Toggle with Safety Modal */}
            <button
              onClick={() => {
                if (!resultsPublished) {
                  setIsPublishConfirmModalOpen(true);
                } else {
                  toggleResultsPublished();
                  setPublishToast('Results withdrawn from Student Hub.');
                  setTimeout(() => setPublishToast(null), 4000);
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 border transition cursor-pointer shadow-sm ${
                resultsPublished
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
              }`}
              title={resultsPublished ? 'Results are live on Student Portal — Click to withdraw' : 'Click to review and publish official results'}
            >
              {resultsPublished ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Results Published to Student Hub</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-white" />
                  <span>Publish Term Results</span>
                </>
              )}
            </button>

            {publishToast && (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{publishToast}</span>
              </span>
            )}

            <Link
              href="/admin/fees"
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-2 border border-slate-200 transition cursor-pointer shadow-sm"
            >
              <DollarSign className="w-4 h-4 text-slate-500" />
              <span>School Fees & Receipt Hub</span>
              {pendingReceiptsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                  {pendingReceiptsCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsPromoteModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-2 border border-slate-200 transition cursor-pointer shadow-sm"
            >
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <span>Promote Class (e.g. SS1 → SS2)</span>
            </button>
          </div>
        </div>

        {/* Clean KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Total Class Arms</span>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 tabular-nums">{classes.length}</p>
            <p className="text-xs text-slate-400 mt-1">Creche through SS3 Arm F</p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Enrolled Students</span>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 tabular-nums">{students.length}</p>
            <p className="text-xs text-slate-400 mt-1">Active registered profiles</p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Teaching Staff</span>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 tabular-nums">{teachers.length}</p>
            <p className="text-xs text-slate-400 mt-1">Assigned faculty profiles</p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Pending Fee Receipts</span>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 tabular-nums">{pendingReceiptsCount}</p>
            <p className="text-xs text-slate-400 mt-1">Awaiting bursar verification</p>
          </div>
        </div>

        {/* Master Student Search Bar */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Search className="w-4 h-4 text-blue-600" />
              <span>Master Student Dossier Lookup</span>
            </div>
            <span className="text-xs text-slate-400">Instant query across all 33 class arms</span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search student by name or Registration Number..."
              value={masterSearchQuery}
              onChange={(e) => setMasterSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white placeholder:text-slate-400"
            />
            {masterSearchQuery && (
              <button
                onClick={() => setMasterSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-gray-600 "
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Instant Search Suggestions / Matches */}
          {masterSearchQuery.trim() !== '' && (
            <div className="border border-gray-200  rounded-xl overflow-hidden bg-gray-50  divide-y divide-gray-200  max-h-60 overflow-y-auto">
              {students.filter(
                (s) =>
                  s.full_name.toLowerCase().includes(masterSearchQuery.toLowerCase()) ||
                  s.reg_number.toLowerCase().includes(masterSearchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-9000 italic">
                  No student records found matching "{masterSearchQuery}".
                </div>
              ) : (
                students
                  .filter(
                    (s) =>
                      s.full_name.toLowerCase().includes(masterSearchQuery.toLowerCase()) ||
                      s.reg_number.toLowerCase().includes(masterSearchQuery.toLowerCase())
                  )
                  .map((std) => {
                    const ledger = getStudentTermLedger(std.id, '1st Term');
                    return (
                      <div
                        key={std.id}
                        onClick={() => {
                          setSelectedStudentForDossier(std);
                          setMasterSearchQuery('');
                        }}
                        className="p-3 hover:bg-gray-100  flex items-center justify-between cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-blue-700 font-bold text-xs flex items-center justify-center">
                            {std.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-gray-900  flex items-center gap-2">
                              <span>{std.full_name}</span>
                              <span className="font-mono text-[10px] text-amber-600  bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {std.reg_number}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-9000 ">
                              {std.class_grade} • Parent: {std.parent_name}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ledger.isUnlocked
                                ? 'bg-emerald-100  text-emerald-700 '
                                : ledger.paymentStatus === 'partially_paid'
                                ? 'bg-amber-100  text-amber-700 '
                                : 'bg-rose-100  text-rose-700 '
                            }`}
                          >
                            {ledger.isUnlocked
                              ? 'Paid'
                              : ledger.paymentStatus === 'partially_paid'
                              ? 'Partial'
                              : 'Unpaid'}
                          </span>
                          <span className="text-xs text-amber-600  font-semibold flex items-center gap-0.5">
                            <span>Open Dossier</span>
                            <Eye className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </div>

        {/* Main Content Layout with 240px Fixed Sidebar on Desktop */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Desktop Left-Hand Fixed Sidebar (240px width) */}
          <aside className="w-full md:w-60 shrink-0 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
              Navigation
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('roster')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                  activeTab === 'roster'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <GraduationCap className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">Student Roster</span>
                </div>
                <span className="text-[11px] tabular-nums font-semibold text-slate-400">{students.length}</span>
              </button>

              <button
                onClick={() => setActiveTab('receipts')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                  activeTab === 'receipts'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Receipt className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">Receipt Verification</span>
                </div>
                {pendingReceiptsCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {pendingReceiptsCount}
                  </span>
                ) : (
                  <span className="text-[11px] tabular-nums text-slate-400">0</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('ledger')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                  activeTab === 'ledger'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <DollarSign className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">Historical Debt</span>
                </div>
                <span className="text-[11px] tabular-nums text-slate-400">{transactions.length}</span>
              </button>

              <button
                onClick={() => setActiveTab('teachers')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                  activeTab === 'teachers'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <UserCheck className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">Teacher Registry</span>
                </div>
                <span className="text-[11px] tabular-nums text-slate-400">{teachers.length}</span>
              </button>

              <button
                onClick={() => setActiveTab('enroll')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'enroll'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-4 h-4 shrink-0 text-slate-500" />
                <span className="truncate">Dual Enrollment</span>
              </button>

              <button
                onClick={() => setActiveTab('notices')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'notices'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Send className="w-4 h-4 shrink-0 text-slate-500" />
                <span className="truncate">Announcements</span>
              </button>

              <button
                onClick={() => setActiveTab('attendance')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                  activeTab === 'attendance'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <QrCode className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">Staff Attendance</span>
                </div>
                <span className="text-[11px] tabular-nums font-semibold text-slate-400">
                  {todayIsoDate ? staffAttendance.filter((a) => a.check_in_time.startsWith(todayIsoDate)).length : staffAttendance.length} Today
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('admin-security');
                  setAdminPassError(null);
                  setAdminPassSuccess(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'admin-security'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0 text-slate-500" />
                <span className="truncate">Security & Password</span>
              </button>
            </nav>
          </aside>

          {/* Right Main Panel */}
          <main className="flex-1 w-full min-w-0">

        {/* TAB 1: STUDENT ROSTER & DUAL AUDIT TRACKING BADGES */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search name, Reg Number, parent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 w-full sm:w-64 placeholder:text-slate-9000"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 whitespace-nowrap">Filter Class:</span>
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-full sm:w-48 cursor-pointer"
                >
                  <option value="all">All 33 Class Arms</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Reg No & PIN</th>
                    <th className="px-4 py-3">Class Arm</th>
                    <th className="px-4 py-3">Parent Info (+234)</th>
                    <th className="px-4 py-3">Enrollment Provenance</th>
                    <th className="px-4 py-3 text-center">Fee Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 italic">
                        No student records match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std) => (
                      <tr key={std.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div>{std.full_name}</div>
                          <div className="text-[10px] text-slate-500 font-normal">Session: {std.session}</div>
                        </td>

                        <td className="px-4 py-3 font-mono">
                          <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                            <span>{std.reg_number}</span>
                            <button
                              onClick={() => copyToClipboard(std.reg_number, `reg-${std.id}`)}
                              className="text-slate-500 hover:text-white"
                              title="Copy Reg Number"
                            >
                              {copiedId === `reg-${std.id}` ? (
                                <Check className="w-3 h-3 text-emerald-700" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-blue-600" />
                            <span>PIN: {std.access_pin}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-800">
                          {std.class_grade}
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-slate-800">{std.parent_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{std.parent_phone}</div>
                        </td>

                        {/* Dual Enrollment Audit Provenance Badge */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                std.enrolled_by_role === 'Form Teacher'
                                  ? 'bg-slate-50 text-blue-700 border border-amber-600/40'
                                  : std.enrolled_by_role === 'Principal'
                                  ? 'bg-blue-600/60 text-rose-200 border border-blue-600'
                                  : 'bg-slate-50 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {std.enrolled_by_role || 'Bursar'}
                            </span>
                            <div className="text-[11px] text-slate-700 truncate max-w-[140px]">
                              By: {std.enrolled_by_name || 'System Admin'}
                            </div>
                            <div className="text-[10px] text-slate-9000 font-mono">
                              {std.enrollment_date
                                ? new Date(std.enrollment_date).toLocaleDateString('en-GB')
                                : 'Registered'}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {(() => {
                            const ledger = getStudentTermLedger(std.id, '1st Term');
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <button
                                  onClick={() => toggleStudentFeeStatus(std.id)}
                                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                                    ledger.isUnlocked
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-600/60'
                                      : ledger.paymentStatus === 'partially_paid'
                                      ? 'bg-amber-950/70 text-blue-700 border-amber-700 hover:bg-amber-900/60'
                                      : 'bg-rose-50 text-rose-700 border-blue-600 hover:bg-blue-600/60'
                                  }`}
                                  title="Toggle clearance status"
                                >
                                  {ledger.isUnlocked
                                    ? 'Paid in Full'
                                    : ledger.paymentStatus === 'partially_paid'
                                    ? 'Partially Paid'
                                    : 'Unpaid'}
                                </button>
                                {ledger.totalPaid > 0 && ledger.remainingBalance > 0 && (
                                  <span className="text-[10px] font-mono text-blue-600">
                                    Debt: {formatNaira(ledger.remainingBalance)}
                                  </span>
                                )}
                                <button
                                  onClick={() => setSelectedStudentForLedger(std)}
                                  className="text-[10px] text-slate-500 hover:text-blue-600 underline font-semibold mt-0.5 cursor-pointer"
                                >
                                  View Ledger
                                </button>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="block md:hidden space-y-3">
              {filteredStudents.length === 0 ? (
                <div className="p-6 text-center text-slate-500 italic bg-white rounded-xl border border-slate-200 text-xs">
                  No student records match the selected filter.
                </div>
              ) : (
                filteredStudents.map((std) => {
                  const ledger = getStudentTermLedger(std.id, '1st Term');
                  return (
                    <div
                      key={std.id}
                      className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{std.full_name}</h4>
                          <span className="text-[10px] text-slate-500">Class: {std.class_grade}</span>
                        </div>
                        <button
                          onClick={() => toggleStudentFeeStatus(std.id)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                            ledger.isUnlocked
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : ledger.paymentStatus === 'partially_paid'
                              ? 'bg-amber-950/70 text-blue-700 border-amber-700'
                              : 'bg-rose-50 text-rose-700 border-blue-600'
                          }`}
                        >
                          {ledger.isUnlocked ? 'Paid in Full' : ledger.paymentStatus === 'partially_paid' ? 'Partially Paid' : 'Unpaid'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/60 font-mono">
                        <div>
                          <div className="text-[10px] text-slate-500 font-sans">Reg Number</div>
                          <div className="text-blue-600 font-bold flex items-center gap-1">
                            <span>{std.reg_number}</span>
                            <button
                              onClick={() => copyToClipboard(std.reg_number, `reg-${std.id}`)}
                              className="text-slate-500 hover:text-white"
                            >
                              {copiedId === `reg-${std.id}` ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 font-sans">Portal PIN</div>
                          <div className="text-slate-800">{std.access_pin}</div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-700 flex items-center justify-between pt-1">
                        <div>
                          <div className="text-[10px] text-slate-500">Parent</div>
                          <div>{std.parent_name} ({std.parent_phone})</div>
                        </div>
                        <button
                          onClick={() => setSelectedStudentForLedger(std)}
                          className="text-xs text-blue-600 underline font-semibold cursor-pointer"
                        >
                          Ledger →
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: RECEIPT VERIFICATION QUEUE */}
        {activeTab === 'receipts' && (
          <div className="space-y-4">
            <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 text-blue-600 border border-slate-200">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Pending Receipt Verification Queue</h3>
                    <p className="text-xs text-slate-500">
                      Bursar 3-action verification: Confirm Full Payment, Mark Partial Payment, or Reject.
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/fees"
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                >
                  <span>Open Full Fees Desk</span>
                  <TrendingUp className="w-3.5 h-3.5" />
                </Link>
              </div>

              {receipts.filter((r) => r.status === 'pending_verification').length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-slate-500">No receipts pending verification.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Class & Term</th>
                        <th className="px-4 py-3">Amount Claimed</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">Receipt Document</th>
                        <th className="px-4 py-3 text-center">3 Action Buttons</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {receipts
                        .filter((r) => r.status === 'pending_verification')
                        .map((r) => {
                          const rTerm = r.term || '1st Term';
                          const ledger = getStudentTermLedger(r.student_id, rTerm);
                          const previousPaid = transactions
                            .filter((tx) => tx.student_id === r.student_id && tx.term === rTerm)
                            .reduce((sum, tx) => sum + tx.amount_credited, 0);
                          const previousDebt = Math.max(0, ledger.totalTermFee - previousPaid);

                          return (
                            <tr key={r.id} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-900">{r.student_name}</div>
                                <div className="font-mono text-slate-500 text-[10px]">{r.reg_number}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                <div>{r.class_grade}</div>
                                <span className="text-[10px] text-blue-600 font-semibold">{rTerm}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-blue-600 font-bold">
                                {formatNaira(r.amount_claimed)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  r.payment_mode === 'partial'
                                    ? 'bg-amber-950/70 text-blue-700 border border-amber-700'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                }`}>
                                  {r.payment_mode === 'partial' ? 'Partial' : 'Full'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => setViewingReceipt(r.id)}
                                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="truncate max-w-[120px] sm:max-w-[160px] underline">{r.file_name}</span>
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {/* 0. Eye: Preview / Download Receipt PDF */}
                                  <button
                                    type="button"
                                    onClick={() => setViewingReceipt(r.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-blue-700 border border-slate-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-sm"
                                    title="View and download payment receipt proof"
                                  >
                                    <Eye className="w-3 h-3 text-blue-600" />
                                    <span>View PDF</span>
                                  </button>

                                  {/* 1. Green: Confirm Full Payment */}
                                  <button
                                    onClick={() =>
                                      setConfirmFullModalReceipt({
                                        id: r.id,
                                        studentName: r.student_name,
                                        term: rTerm,
                                        amount: r.amount_claimed,
                                        regNumber: r.reg_number,
                                      })
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-800 text-emerald-100 border border-emerald-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-sm"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                    <span>Confirm Full Payment</span>
                                  </button>

                                  {/* 2. Amber/Gold: Mark Partial Payment */}
                                  <button
                                    onClick={() => {
                                      const claimed = r.amount_claimed;
                                      setPartialModalReceipt({
                                        id: r.id,
                                        studentId: r.student_id,
                                        studentName: r.student_name,
                                        term: rTerm,
                                        regNumber: r.reg_number,
                                        amountClaimed: claimed,
                                        totalTermFee: ledger.totalTermFee,
                                        previousPaid,
                                        previousDebt,
                                        customApprovedAmount: claimed,
                                        newRemainingBalance: Math.max(0, previousDebt - claimed),
                                      });
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-gray-950 font-black text-[10px] flex items-center gap-1 cursor-pointer transition shadow-sm"
                                  >
                                    <Clock className="w-3 h-3 text-gray-950" />
                                    <span>Mark Partial Payment</span>
                                  </button>

                                  {/* 3. Red: Reject */}
                                  <button
                                    onClick={() => {
                                      setRejectModalReceipt({
                                        id: r.id,
                                        studentName: r.student_name,
                                        regNumber: r.reg_number,
                                        term: rTerm,
                                      });
                                      setCustomRejectNote('Invalid transfer receipt or mismatched credit. Please re-upload.');
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-blue-600 text-rose-700 border border-blue-600 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Reject</span>
                                  </button>
                                </div>
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

        {/* TAB 3: HISTORICAL DEBT LEDGER & TRANSACTIONS BREAKDOWN */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                <div className="p-2.5 rounded-xl bg-slate-50 text-blue-600 border border-slate-200">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Historical Payment Breakdown & Remaining Debt Ledger</h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive ledger of credited payment transactions, transaction timestamps, and remaining balance due per pupil.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Transaction Date</th>
                      <th className="px-4 py-3">Student Name & Reg No</th>
                      <th className="px-4 py-3">Class & Term</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Amount Credited</th>
                      <th className="px-4 py-3 text-right">Remaining Debt</th>
                      <th className="px-4 py-3">Verified By / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-850 transition">
                        <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                          {new Date(tx.transaction_date).toLocaleDateString('en-NG', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                          <span className="block text-[10px] text-slate-9000">
                            {new Date(tx.transaction_date).toLocaleTimeString('en-NG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{tx.student_name}</div>
                          <div className="font-mono text-blue-600 text-[10px]">{tx.reg_number}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{tx.class_grade}</div>
                          <span className="text-[10px] text-slate-500 font-semibold">{tx.term}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tx.payment_type === 'full'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                              : 'bg-amber-950/80 text-blue-700 border border-amber-800'
                          }`}>
                            {tx.payment_type === 'full' ? 'Full Settlement' : 'Partial Deposit'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 text-sm">
                          +{formatNaira(tx.amount_credited)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold text-sm ${
                          tx.remaining_debt === 0 ? 'text-emerald-700' : 'text-blue-600'
                        }`}>
                          {formatNaira(tx.remaining_debt)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          <span className="text-slate-700 block">{tx.verified_by || 'Bursary Desk'}</span>
                          <span className="text-[10px] italic text-slate-9000">{tx.note || 'Confirmed'}</span>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-9000 italic">
                          No transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEACHER REGISTRY & SECURITY CREDENTIAL REVOCATION */}
        {activeTab === 'teachers' && (
          <div className="space-y-4">
            <TeacherRegistry />
          </div>
        )}

        {/* TAB 5: ADMIN DUAL ENROLLMENT ENGINE */}
        {activeTab === 'enroll' && (
          <div className="max-w-2xl mx-auto">
            <EnrollStudentForm
              defaultEnrolledByRole="Principal"
              defaultEnrolledByName="School Administrator"
              title="Principal / Admin Student Enrollment"
              description="Directly register new pupils into any of the 33 classes (Creche to SS3 Arm F) with automatic audit tracking provenance."
            />
          </div>
        )}

        {/* TAB 6: PUBLISH ANNOUNCEMENTS */}
        {activeTab === 'notices' && (
          <div className="max-w-2xl mx-auto p-6 bg-white border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold uppercase tracking-wider">
              <Send className="w-4 h-4 text-blue-600" />
              <span>Broadcast Notice</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Publish School Announcement</h2>
            <p className="text-xs text-slate-500">
              Notices appear instantly on all student report portals and teacher academic dashboards.
            </p>

            <form onSubmit={handleBroadcast} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Title:</label>
                <input
                  type="text"
                  placeholder="e.g. 1st Term Mid-Term Break & CA Test Schedule"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-slate-9000"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level:</label>
                <select
                  value={annPriority}
                  onChange={(e) => setAnnPriority(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="normal">Normal Announcement</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Body:</label>
                <textarea
                  rows={4}
                  placeholder="Full announcement details visible immediately to parents and pupils..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-slate-9000"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-blue-600 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Broadcast to School Portals</span>
              </button>

              {annSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                  <span>Announcement published successfully and live on all hubs!</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* TAB 7: ADMIN MASTER PASSWORD & SECURITY SETTINGS */}
        {activeTab === 'admin-security' && (
          <div className="max-w-xl mx-auto my-8 bg-white  rounded-xl p-8 shadow-xl border border-gray-200  transition-colors duration-200 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 ">
              <div className="p-3.5 rounded-xl bg-blue-50 text-amber-600  border border-blue-200">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 ">
                  Admin Master Password Settings
                </h2>
                <p className="text-xs text-slate-9000  mt-0.5">
                  Update your system administrator login credentials and security parameters.
                </p>
              </div>
            </div>

            {adminPassError && (
              <div className="p-3.5 rounded-xl bg-rose-50  border border-rose-200  text-rose-700  text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 " />
                <span>{adminPassError}</span>
              </div>
            )}

            {adminPassSuccess ? (
              <div className="p-6 rounded-xl bg-emerald-50  border border-emerald-200  text-emerald-800  text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-sm">Master Password Successfully Updated!</h3>
                <p className="text-xs text-gray-600  max-w-sm mx-auto">
                  Your administrator credentials have been securely refreshed and saved to local session storage.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAdminPassSuccess(false);
                    setAdminCurrentPass('');
                    setAdminNewPass('');
                    setAdminConfirmPass('');
                  }}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md transition"
                >
                  Change Again / Dismiss
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setAdminPassError(null);
                  if (adminNewPass !== adminConfirmPass) {
                    setAdminPassError('New password and confirmation do not match.');
                    return;
                  }
                  if (adminNewPass.length < 6) {
                    setAdminPassError('New password must be at least 6 characters.');
                    return;
                  }
                  const res = updateAdminPassword(adminCurrentPass, adminNewPass);
                  if (res.success) {
                    setAdminPassSuccess(true);
                    setAdminCurrentPass('');
                    setAdminNewPass('');
                    setAdminConfirmPass('');
                  } else {
                    setAdminPassError(res.message || 'Failed to update admin password.');
                  }
                }}
                className="space-y-5 text-xs"
              >
                <div>
                  <label className="block text-gray-700  font-semibold mb-1.5">
                    Current Password:
                  </label>
                  <input
                    type="password"
                    required
                    value={adminCurrentPass}
                    onChange={(e) => setAdminCurrentPass(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-gray-50  border border-slate-200  rounded-xl px-4 py-3 text-xs text-gray-900  focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700  font-semibold mb-1.5">
                    New Password (min 6 characters):
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={adminNewPass}
                    onChange={(e) => setAdminNewPass(e.target.value)}
                    placeholder="Enter new master password"
                    className="w-full bg-gray-50  border border-slate-200  rounded-xl px-4 py-3 text-xs text-gray-900  focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700  font-semibold mb-1.5">
                    Confirm New Password:
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={adminConfirmPass}
                    onChange={(e) => setAdminConfirmPass(e.target.value)}
                    placeholder="Re-enter new master password"
                    className="w-full bg-gray-50  border border-slate-200  rounded-xl px-4 py-3 text-xs text-gray-900  focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-blue-600 transition cursor-pointer shadow-md mt-4"
                >
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>Update Master Password</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 7: Staff Attendance & Geofence Audit */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Header + Actions */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-1">
                    <QrCode className="w-4 h-4" />
                    <span>Geofenced Staff Attendance System</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Faculty Clock-In & Punctuality Audit
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    School-level geofencing (Haversine formula), printable QR gate posters, and live arrival audits.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsQrPosterModalOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Print QR Gate Poster</span>
                  </button>
                </div>
              </div>

              {/* Geofence GPS & Cutoff Configuration */}
              <div className="pt-5 space-y-4">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Campus Geofence & Resumption Settings</span>
                </div>

                {geofenceSaveNotice && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{geofenceSaveNotice}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">School Latitude</label>
                    <input
                      type="text"
                      value={geofenceLat}
                      onChange={(e) => setGeofenceLat(e.target.value)}
                      placeholder="e.g. 6.5244"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">School Longitude</label>
                    <input
                      type="text"
                      value={geofenceLon}
                      onChange={(e) => setGeofenceLon(e.target.value)}
                      placeholder="e.g. 3.3792"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Radius (Meters: 50m – 150m)</label>
                    <input
                      type="number"
                      min={50}
                      max={150}
                      value={geofenceRadius}
                      onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Resumption Cutoff Time</label>
                    <input
                      type="time"
                      value={resumptionCutoff}
                      onChange={(e) => setResumptionCutoff(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isCapturingGps}
                    onClick={() => {
                      if (!navigator.geolocation) {
                        alert('Geolocation is not supported by your browser.');
                        return;
                      }
                      setIsCapturingGps(true);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setGeofenceLat(pos.coords.latitude.toFixed(6));
                          setGeofenceLon(pos.coords.longitude.toFixed(6));
                          setIsCapturingGps(false);
                          setGeofenceSaveNotice('Current GPS coordinates captured! Click "Save Campus Geofence" to apply.');
                          setTimeout(() => setGeofenceSaveNotice(null), 4000);
                        },
                        (err) => {
                          setIsCapturingGps(false);
                          alert(`GPS capture failed: ${err.message}`);
                        },
                        { enableHighAccuracy: true, timeout: 15000 }
                      );
                    }}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer border border-slate-300 flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isCapturingGps ? 'Capturing GPS...' : 'Capture Current School GPS Location'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const latNum = parseFloat(geofenceLat);
                      const lonNum = parseFloat(geofenceLon);
                      if (isNaN(latNum) || isNaN(lonNum)) {
                        alert('Please enter valid numeric latitude and longitude coordinates.');
                        return;
                      }
                      const res = await updateSchoolGeofence({
                        latitude: latNum,
                        longitude: lonNum,
                        geofenceRadiusMeters: geofenceRadius,
                        resumptionCutoffTime: resumptionCutoff,
                      });
                      if (res.success) {
                        setGeofenceSaveNotice('Campus Geofence & Resumption Cutoff saved successfully.');
                        setTimeout(() => setGeofenceSaveNotice(null), 4000);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    Save Campus Geofence
                  </button>
                </div>
              </div>
            </div>

            {/* Today's Live Roll Call KPI Cards */}
            {(() => {
              const todayStr = todayIsoDate;
              const todayRecords = todayStr ? staffAttendance.filter((a) => a.check_in_time.startsWith(todayStr)) : staffAttendance;
              const presentCount = todayRecords.filter((a) => a.status === 'PRESENT').length;
              const lateCount = todayRecords.filter((a) => a.status === 'LATE').length;
              const clockedInTeacherIds = new Set(todayRecords.map((a) => a.teacher_id));
              const notClockedCount = Math.max(0, teachers.length - clockedInTeacherIds.size);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Total Faculty</span>
                    <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{teachers.length}</div>
                    <span className="text-[10px] text-slate-400">Assigned teachers</span>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase">On-Time (Present)</span>
                    <div className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">{presentCount}</div>
                    <span className="text-[10px] text-slate-400">Before {resumptionCutoff}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-amber-600 uppercase">Late Arrivals</span>
                    <div className="text-2xl font-black text-amber-600 mt-1 tabular-nums">{lateCount}</div>
                    <span className="text-[10px] text-slate-400">After {resumptionCutoff}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-rose-600 uppercase">Not Clocked In</span>
                    <div className="text-2xl font-black text-rose-600 mt-1 tabular-nums">{notClockedCount}</div>
                    <span className="text-[10px] text-slate-400">Awaiting check-in</span>
                  </div>
                </div>
              );
            })()}

            {/* Attendance Audit Log & Period Filtering */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900">Punctuality Audit Log</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Period Filter Buttons */}
                  <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
                    {(['today', 'week', 'month', 'all'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setAttendancePeriodFilter(period)}
                        className={`px-3 py-1 rounded-md capitalize font-semibold transition cursor-pointer ${
                          attendancePeriodFilter === period
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Logs'}
                      </button>
                    ))}
                  </div>

                  {/* Teacher Selector Filter */}
                  <select
                    value={attendanceTeacherFilter}
                    onChange={(e) => setAttendanceTeacherFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="all">All Teachers ({teachers.length})</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.teacher_id_code})
                      </option>
                    ))}
                  </select>

                  {/* Export CSV Button */}
                  <button
                    onClick={() => {
                      const csvHeader = 'Teacher Name,Date,Check-In Time,Clock-Out Time,Status,Recorded Distance\n';
                      const csvRows = staffAttendance.map((a) => {
                        const date = new Date(a.check_in_time).toLocaleDateString();
                        const checkIn = new Date(a.check_in_time).toLocaleTimeString();
                        const clockOut = a.clock_out_time ? new Date(a.clock_out_time).toLocaleTimeString() : 'N/A';
                        const dist = a.distance_meters !== null && a.distance_meters !== undefined ? `${a.distance_meters}m` : 'N/A';
                        return `"${a.teacher_name}","${date}","${checkIn}","${clockOut}","${a.status}","${dist}"`;
                      }).join('\n');

                      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `staff_attendance_${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Attendance Table */}
              {(() => {
                const filteredAttendance = staffAttendance.filter((att) => {
                  const attDate = new Date(att.check_in_time);

                  // Filter by teacher
                  if (attendanceTeacherFilter !== 'all' && att.teacher_id !== attendanceTeacherFilter) {
                    return false;
                  }

                  // Filter by period
                  if (attendancePeriodFilter === 'today') {
                    return todayIsoDate ? att.check_in_time.startsWith(todayIsoDate) : true;
                  } else if (attendancePeriodFilter === 'week') {
                    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
                    return attDate >= oneWeekAgo;
                  } else if (attendancePeriodFilter === 'month') {
                    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
                    return attDate >= oneMonthAgo;
                  }
                  return true;
                });

                if (filteredAttendance.length === 0) {
                  return (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
                      <QrCode className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">No attendance clock-in records found for this period.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Teachers can scan the QR code poster in their staffroom to clock in.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs divide-y divide-slate-200">
                      <thead className="bg-slate-50 text-slate-500 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Faculty / Teacher</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Check-In</th>
                          <th className="px-4 py-3">Clock-Out</th>
                          <th className="px-4 py-3">Punctuality Status</th>
                          <th className="px-4 py-3">Distance Recorded</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredAttendance.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-3 font-semibold text-slate-900">{rec.teacher_name}</td>
                            <td className="px-4 py-3 text-slate-600">{new Date(rec.check_in_time).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-mono tabular-nums text-slate-800">
                              {new Date(rec.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-slate-600">
                              {rec.clock_out_time ? (
                                new Date(rec.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Active</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {rec.status === 'PRESENT' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Present • On Time
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Late Arrival
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                              {rec.distance_meters !== null && rec.distance_meters !== undefined ? `${rec.distance_meters}m` : 'In Geofence'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Staff Attendance QR Printable Poster Overlay Modal */}
        {currentSchool && (
          <StaffAttendanceQROverlay
            school={currentSchool}
            isOpen={isQrPosterModalOpen}
            onClose={() => setIsQrPosterModalOpen(false)}
          />
        )}

          </main>
        </div>

        {/* PROMOTE CLASS MODAL */}
        {isPromoteModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 sm:p-8 text-slate-900 shadow-xl relative">
              <button
                onClick={() => {
                  setIsPromoteModalOpen(false);
                  setPromoteNotice(null);
                }}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 rounded-lg bg-slate-100 border border-slate-200 cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-xl bg-slate-50 text-blue-600 border border-slate-200">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Promote Class Level</h3>
                  <p className="text-xs text-slate-500">
                    Advance all students across tiers (e.g. JSS 3 → SS1 Arm A, SS1 Arm A → SS2 Arm A).
                  </p>
                </div>
              </div>

              {promoteNotice && (
                <div
                  className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 ${
                    promoteNotice.success
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-700'
                      : 'bg-rose-50 border border-blue-600 text-rose-700'
                  }`}
                >
                  {promoteNotice.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  )}
                  <span>{promoteNotice.message}</span>
                </div>
              )}

              <form onSubmit={handlePromoteClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Current Source Class (Promote From):
                  </label>
                  <select
                    value={fromClassId}
                    onChange={(e) => setFromClassId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  >
                    {classes.map((cls) => {
                      const count = students.filter((s) => s.class_id === cls.id).length;
                      return (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({count} students enrolled)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Destination Next Class (Promote To):
                  </label>
                  <select
                    value={toClassId}
                    onChange={(e) => setToClassId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Session {cls.session})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preview Students */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                  <span className="font-semibold text-slate-500 block text-[11px] uppercase tracking-wider">
                    Students to be advanced ({studentsInSourceClass.length}):
                  </span>
                  {studentsInSourceClass.length === 0 ? (
                    <p className="text-slate-9000 italic">No students currently in selected source class.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {studentsInSourceClass.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[11px]"
                        >
                          {s.full_name} ({s.reg_number})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={studentsInSourceClass.length === 0}
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-blue-600 transition cursor-pointer disabled:opacity-50"
                  >
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span>Confirm Promotion of Students</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Detailed Student Debt & Historical Transactions Ledger */}
        {selectedStudentForLedger && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 sm:p-7 text-slate-900 shadow-2xl relative space-y-5">
              <button
                onClick={() => setSelectedStudentForLedger(null)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 rounded-lg bg-slate-100 border border-slate-200 cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-50 text-blue-600 border border-slate-200">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Student Debt & Payment History Ledger</h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudentForLedger.full_name} ({selectedStudentForLedger.reg_number}) • {selectedStudentForLedger.class_grade}
                  </p>
                </div>
              </div>

              {/* Term Ledger Breakdown */}
              {(() => {
                const ledger = getStudentTermLedger(selectedStudentForLedger.id, '1st Term');
                const studentTx = transactions.filter(
                  (tx) => tx.student_id === selectedStudentForLedger.id
                );

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Term Fee</span>
                        <span className="text-sm font-black text-slate-900 font-mono mt-0.5 block">
                          {formatNaira(ledger.totalTermFee)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[10px] text-emerald-700 font-semibold uppercase block">Total Credited</span>
                        <span className="text-sm font-black text-emerald-700 font-mono mt-0.5 block">
                          {formatNaira(ledger.totalPaid)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[10px] text-blue-600 font-semibold uppercase block">Remaining Debt</span>
                        <span className={`text-sm font-black font-mono mt-0.5 block ${
                          ledger.remainingBalance === 0 ? 'text-emerald-700' : 'text-blue-600'
                        }`}>
                          {formatNaira(ledger.remainingBalance)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Result Slip Download Status:</span>
                      <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                        ledger.isUnlocked
                          ? 'bg-emerald-950 text-emerald-700 border border-emerald-300'
                          : 'bg-rose-50 text-rose-700 border border-blue-600'
                      }`}>
                        {ledger.isUnlocked ? 'Unlocked (Full Payment Cleared)' : 'Locked (Remaining Debt > ₦0)'}
                      </span>
                    </div>

                    {/* Historical Transactions List */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Credited Transactions ({studentTx.length})
                      </span>
                      {studentTx.length === 0 ? (
                        <p className="text-xs text-slate-9000 italic p-4 bg-slate-50 rounded-xl text-center">
                          No payments recorded yet for this student.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {studentTx.map((tx) => (
                            <div
                              key={tx.id}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-slate-800 block">
                                  {tx.payment_type === 'full' ? 'Full Settlement' : 'Partial Deposit'} — {tx.term}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(tx.transaction_date).toLocaleDateString('en-NG')} at{' '}
                                  {new Date(tx.transaction_date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-emerald-700 block text-sm">
                                  +{formatNaira(tx.amount_credited)}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Bal: {formatNaira(tx.remaining_debt)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* MODAL 1: Confirm Full Payment Modal */}
        {confirmFullModalReceipt && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-5 relative">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Confirm Full Fee Settlement</h3>
                  <p className="text-xs text-slate-500">Mark Term as Paid in Full & Unlock Result Slip</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <p className="text-slate-800 text-sm font-semibold leading-relaxed">
                  Confirm complete fee clearance for{' '}
                  <span className="text-blue-600 font-bold">{confirmFullModalReceipt.studentName}</span> (
                  <span className="text-emerald-700 font-bold">{confirmFullModalReceipt.term}</span>)?
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-slate-500 text-[11px]">
                  <span>Reg: <strong className="text-white font-mono">{confirmFullModalReceipt.regNumber}</strong></span>
                  <span>Claimed: <strong className="text-blue-600 font-mono">{formatNaira(confirmFullModalReceipt.amount)}</strong></span>
                </div>
                <p className="text-[11px] text-emerald-700 pt-1">
                  ✓ Student remaining balance will be zeroed out (₦0.00). Official Result Slip will UNLOCK immediately.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmFullModalReceipt(null)}
                  className="w-full py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    approveReceipt(confirmFullModalReceipt.id);
                    setConfirmFullModalReceipt(null);
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-800 text-emerald-100 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-300 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Confirm Paid in Full</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Mark Partial Payment Modal */}
        {partialModalReceipt && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 text-slate-900 shadow-2xl space-y-5 relative">
              <button
                onClick={() => setPartialModalReceipt(null)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 rounded-lg bg-slate-100 border border-slate-200 cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-950/80 text-blue-600 border border-amber-700">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Authorize Partial Payment Deposit</h3>
                  <p className="text-xs text-slate-500">
                    {partialModalReceipt.studentName} ({partialModalReceipt.regNumber}) • {partialModalReceipt.term}
                  </p>
                </div>
              </div>

              {/* 3 Clear Highlight Cards: Amount Claimed, Previous Debt, New Remaining Balance */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Amount Claimed</span>
                  <span className="text-sm font-black text-blue-600 font-mono mt-0.5 block">
                    {formatNaira(partialModalReceipt.amountClaimed)}
                  </span>
                  <span className="text-[9px] text-slate-9000">Student Deposit</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-rose-700 font-semibold uppercase block">Previous Debt</span>
                  <span className="text-sm font-black text-rose-700 font-mono mt-0.5 block">
                    {formatNaira(partialModalReceipt.previousDebt)}
                  </span>
                  <span className="text-[9px] text-slate-9000">Before Verification</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase block">New Balance</span>
                  <span className="text-sm font-black text-emerald-700 font-mono mt-0.5 block">
                    {formatNaira(partialModalReceipt.newRemainingBalance)}
                  </span>
                  <span className="text-[9px] text-slate-9000">Remaining Debt</span>
                </div>
              </div>

              {/* Editable deposit credit input */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Verified Deposit to Credit (₦):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-mono font-bold">₦</span>
                    <input
                      type="number"
                      value={partialModalReceipt.customApprovedAmount}
                      onChange={(e) => {
                        const approved = Number(e.target.value) || 0;
                        const newBal = Math.max(0, partialModalReceipt.previousDebt - approved);
                        setPartialModalReceipt({
                          ...partialModalReceipt,
                          customApprovedAmount: approved,
                          newRemainingBalance: newBal,
                        });
                      }}
                      className="w-full bg-gray-950 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-blue-700 text-[11px] flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>
                    Result slip will remain <strong>LOCKED</strong> because the new remaining debt is{' '}
                    <strong>{formatNaira(partialModalReceipt.newRemainingBalance)}</strong>.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setPartialModalReceipt(null)}
                  className="w-full py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Abort</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    confirmPartialPayment(
                      partialModalReceipt.id,
                      partialModalReceipt.customApprovedAmount,
                      `Partial payment of ${formatNaira(partialModalReceipt.customApprovedAmount)} credited by Bursar.`
                    );
                    setPartialModalReceipt(null);
                  }}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-gray-950 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-gray-950" />
                  <span>Authorize Partial Deposit</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: Reject Receipt Modal */}
        {rejectModalReceipt && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-5 relative">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-rose-50/80 text-rose-700 border border-blue-600">
                  <X className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Reject Payment Receipt</h3>
                  <p className="text-xs text-slate-500">
                    {rejectModalReceipt.studentName} ({rejectModalReceipt.regNumber}) • {rejectModalReceipt.term}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-700">
                  State the reason why this bank transfer proof is rejected. The student will be prompted to re-upload.
                </p>
                <textarea
                  rows={3}
                  value={customRejectNote}
                  onChange={(e) => setCustomRejectNote(e.target.value)}
                  placeholder="e.g. Incomplete transfer reference or blurred bank receipt..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setRejectModalReceipt(null)}
                  className="w-full py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    rejectReceipt(rejectModalReceipt.id, customRejectNote);
                    setRejectModalReceipt(null);
                  }}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-600 transition cursor-pointer"
                >
                  <X className="w-4 h-4 text-blue-600" />
                  <span>Reject & Request Re-upload</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: Student Master Dossier Modal */}
        {selectedStudentForDossier && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white  border border-gray-200  rounded-xl max-w-2xl w-full p-6 text-gray-900  shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedStudentForDossier(null)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-gray-700  rounded-lg bg-gray-100  cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Dossier Header */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-600 border border-blue-600 flex items-center justify-center text-blue-700 font-black text-2xl shadow-md shrink-0">
                  {selectedStudentForDossier.full_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-amber-600  border border-blue-200 font-bold">
                      {selectedStudentForDossier.reg_number}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-600 text-blue-700 font-semibold">
                      PIN: {selectedStudentForDossier.access_pin}
                    </span>
                    <span className="text-xs text-slate-9000">Session {selectedStudentForDossier.session}</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900  mt-1">
                    {selectedStudentForDossier.full_name}
                  </h2>
                  <p className="text-xs text-slate-9000 ">
                    Parent: {selectedStudentForDossier.parent_name} • {selectedStudentForDossier.parent_phone}
                  </p>
                </div>
              </div>

              {/* 3 Pillars: Enrollment Provenance, Academic Placement, Financial Ledger */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Enrollment Provenance */}
                <div className="p-3.5 rounded-xl bg-gray-50  border border-gray-200  space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600  block">
                    1. Enrollment Provenance
                  </span>
                  <div className="text-xs font-semibold text-gray-800 ">
                    Enrolled By: <span className="text-rose-700 ">{selectedStudentForDossier.enrolled_by_role || 'System'}</span>
                  </div>
                  <div className="text-[11px] text-gray-600 ">
                    Staff: {selectedStudentForDossier.enrolled_by_name || 'School Administrator'}
                  </div>
                  <div className="text-[10px] text-slate-9000 font-mono">
                    Timestamp: {selectedStudentForDossier.enrollment_date || selectedStudentForDossier.created_at || 'Registered'}
                  </div>
                  <div className="text-[10px] text-emerald-600  font-semibold pt-1">
                    {selectedStudentForDossier.ndpa_consent_granted ? '✓ NDPA 2023 Consented' : 'Standard Shield'}
                  </div>
                </div>

                {/* 2. Academic Placement */}
                <div className="p-3.5 rounded-xl bg-gray-50  border border-gray-200  space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600  block">
                    2. Academic Placement
                  </span>
                  <div className="text-xs font-bold text-gray-800 ">
                    {selectedStudentForDossier.class_grade}
                  </div>
                  <div className="text-[11px] text-gray-600 ">
                    Term: 1st Term Assessment
                  </div>
                  <div className="text-[11px] text-gray-600 ">
                    Cumulative GPA: <strong className="text-amber-600 ">{selectedStudentForDossier.gpa.toFixed(2)}</strong>
                  </div>
                  <div className="text-[10px] text-slate-9000 font-mono">
                    Attendance: {selectedStudentForDossier.attendance_percentage}%
                  </div>
                </div>

                {/* 3. Financial Ledger Status */}
                {(() => {
                  const ledger = getStudentTermLedger(selectedStudentForDossier.id, '1st Term');
                  return (
                    <div className="p-3.5 rounded-xl bg-gray-50  border border-gray-200  space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600  block">
                        3. Financial Ledger (₦)
                      </span>
                      <div className="text-xs font-bold text-gray-800  flex justify-between">
                        <span>Total Due:</span>
                        <span className="font-mono">{formatNaira(ledger.totalTermFee)}</span>
                      </div>
                      <div className="text-xs text-emerald-600  font-semibold flex justify-between">
                        <span>Paid:</span>
                        <span className="font-mono">{formatNaira(ledger.totalPaid)}</span>
                      </div>
                      <div className="text-xs text-rose-600  font-bold flex justify-between">
                        <span>Debt:</span>
                        <span className="font-mono">{formatNaira(ledger.remainingBalance)}</span>
                      </div>
                      <div className="pt-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ledger.isUnlocked
                              ? 'bg-emerald-100  text-emerald-700  border border-emerald-300 '
                              : ledger.paymentStatus === 'partially_paid'
                              ? 'bg-amber-100  text-amber-700  border border-amber-300 '
                              : 'bg-rose-100  text-rose-700  border border-rose-300 '
                          }`}
                        >
                          {ledger.isUnlocked
                            ? 'Cleared • Slip Unlocked'
                            : ledger.paymentStatus === 'partially_paid'
                            ? 'Partially Paid (Locked)'
                            : 'Unpaid • Locked'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Term Result Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900  flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Continuous Assessment & Examination Marks (1st Term)</span>
                  </h4>
                  <span className="text-[11px] text-slate-9000">WAEC Matrix: CA1 (20) + CA2 (20) + Exam (60) = 100</span>
                </div>

                <div className="border border-gray-200  rounded-xl overflow-hidden bg-white ">
                  {results.filter((r) => r.student_id === selectedStudentForDossier.id && r.term === '1st Term').length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-9000 italic">
                      No examination scores recorded for this student in 1st Term yet.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50  text-gray-600  uppercase text-[10px] border-b border-gray-200 ">
                        <tr>
                          <th className="px-4 py-2.5">Subject</th>
                          <th className="px-3 py-2.5 text-center">CA 1 (20)</th>
                          <th className="px-3 py-2.5 text-center">CA 2 (20)</th>
                          <th className="px-3 py-2.5 text-center">Exam (60)</th>
                          <th className="px-3 py-2.5 text-center font-bold">Total</th>
                          <th className="px-3 py-2.5 text-center">Grade</th>
                          <th className="px-4 py-2.5">Audited By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 ">
                        {results
                          .filter((r) => r.student_id === selectedStudentForDossier.id && r.term === '1st Term')
                          .map((res) => {
                            const sub = subjects.find((s) => s.id === res.subject_id);
                            return (
                              <tr key={res.id} className="hover:bg-gray-50 ">
                                <td className="px-4 py-2 font-semibold text-gray-900 ">
                                  {sub?.name || res.subject_id}
                                </td>
                                <td className="px-3 py-2 text-center font-mono text-gray-700 ">{res.ca1}</td>
                                <td className="px-3 py-2 text-center font-mono text-gray-700 ">{res.ca2}</td>
                                <td className="px-3 py-2 text-center font-mono text-gray-700 ">{res.exam}</td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-gray-900 ">
                                  {res.total_score}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      res.grade === 'A'
                                        ? 'bg-emerald-100  text-emerald-700 '
                                        : res.grade === 'B'
                                        ? 'bg-amber-100  text-amber-700 '
                                        : res.grade === 'C'
                                        ? 'bg-gray-100  text-gray-700 '
                                        : 'bg-rose-100  text-rose-700 '
                                    }`}
                                  >
                                    {res.grade}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-[10px] text-slate-9000 font-mono">
                                  {res.audited_by || 'Faculty'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentForLedger(selectedStudentForDossier);
                    setSelectedStudentForDossier(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gray-100  hover:bg-gray-200  text-gray-800  text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                  <span>View Full Transaction Ledger</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStudentForDossier(null)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-sm"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: Publish Results Administrative Gate Confirmation Modal */}
        {isPublishConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="max-w-md w-full bg-white  rounded-xl p-6 shadow-2xl border border-gray-200  text-gray-900  relative max-h-[90vh] overflow-y-auto my-auto space-y-5 transition-colors duration-200">
              <button
                onClick={() => setIsPublishConfirmModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-9000 hover:text-gray-900   rounded-lg bg-gray-100  cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 text-amber-600  border border-blue-200">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 ">
                    Publish Official Term Results?
                  </h3>
                  <p className="text-xs text-slate-9000  font-mono">
                    Institutional Result Release Gate
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50  border border-amber-200  text-xs text-amber-900  leading-relaxed">
                This action will release official terminal result sheets live to all students who have satisfied term fee clearance (<strong>Paid in Full</strong>). Students with outstanding fee debts will continue to see their result downloads locked until their balance is cleared. Are you sure you want to proceed?
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPublishConfirmModalOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300    font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleResultsPublished();
                    setIsPublishConfirmModalOpen(false);
                    setPublishToast('Official term results successfully published live to Student Hub!');
                    setTimeout(() => setPublishToast(null), 5000);
                  }}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Confirm & Publish</span>
                </button>
              </div>
            </div>
          </div>
        )}
      {/* VIEW RECEIPT PDF MODAL */}
      {viewingReceipt && (() => {
        const activeReceipt = receipts.find((r) => r.id === viewingReceipt);
        if (!activeReceipt) return null;
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-900">Payment Receipt Review & PDF Proof</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeReceipt.student_name} ({activeReceipt.reg_number}) • {activeReceipt.class_grade} ({activeReceipt.term || '1st Term'})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:text-white border border-slate-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-y-auto">
                <div className="lg:col-span-7 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden min-h-[380px] h-[480px]">
                  {activeReceipt.file_data_url.startsWith('data:image') || /\.(png|jpe?g|webp|gif|svg)$/i.test(activeReceipt.file_name) ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={activeReceipt.file_data_url}
                        alt="Receipt"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col">
                      <div className="p-3 bg-gray-950 border-b border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{activeReceipt.file_name}</span>
                        </div>
                        <a
                          href={activeReceipt.file_data_url}
                          download={activeReceipt.file_name || 'payment_receipt.pdf'}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-gray-950 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </a>
                      </div>
                      <iframe
                        src={activeReceipt.file_data_url}
                        className="w-full flex-1 border-none rounded-b-2xl bg-white"
                        title={activeReceipt.file_name || 'Payment Receipt PDF'}
                      />
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">Amount Claimed:</span>
                      <p className="text-xl font-black text-blue-600 font-mono mt-0.5">{formatNaira(activeReceipt.amount_claimed)}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">Student & Arm:</span>
                      <p className="font-bold text-slate-800 mt-0.5">{activeReceipt.student_name} ({activeReceipt.class_grade})</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">Status:</span>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-amber-950/70 text-blue-700 border border-amber-800">
                        {activeReceipt.status}
                      </span>
                    </div>
                  </div>

                  {activeReceipt.status === 'pending_verification' && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmFullModalReceipt({
                            id: activeReceipt.id,
                            studentName: activeReceipt.student_name,
                            term: activeReceipt.term || '1st Term',
                            amount: activeReceipt.amount_claimed,
                            regNumber: activeReceipt.reg_number,
                          });
                        }}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-800 text-emerald-100 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-300 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Confirm Full Payment (₦0 Debt & Unlock Result)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const rTerm = activeReceipt.term || '1st Term';
                          const ledger = getStudentTermLedger(activeReceipt.student_id, rTerm);
                          const previousPaid = transactions
                            .filter((tx) => tx.student_id === activeReceipt.student_id && tx.term === rTerm)
                            .reduce((sum, tx) => sum + tx.amount_credited, 0);
                          const previousDebt = Math.max(0, ledger.totalTermFee - previousPaid);
                          const claimed = activeReceipt.amount_claimed;

                          setPartialModalReceipt({
                            id: activeReceipt.id,
                            studentId: activeReceipt.student_id,
                            studentName: activeReceipt.student_name,
                            term: rTerm,
                            regNumber: activeReceipt.reg_number,
                            amountClaimed: claimed,
                            totalTermFee: ledger.totalTermFee,
                            previousPaid,
                            previousDebt,
                            customApprovedAmount: claimed,
                            newRemainingBalance: Math.max(0, previousDebt - claimed),
                          });
                        }}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-gray-950 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Clock className="w-4 h-4 text-gray-950" />
                        <span>Mark Partial Payment (Leaves Result Locked)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalReceipt({
                            id: activeReceipt.id,
                            studentName: activeReceipt.student_name,
                            regNumber: activeReceipt.reg_number,
                            term: activeReceipt.term || '1st Term',
                          });
                          setCustomRejectNote('Invalid transfer receipt or mismatched credit. Please re-upload.');
                        }}
                        className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-blue-600 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 border border-blue-600 transition cursor-pointer"
                      >
                        <X className="w-4 h-4 text-rose-700" />
                        <span>Reject Receipt</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      </div>
    </div>
  );
}