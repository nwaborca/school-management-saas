'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { StudentProfile, formatNaira } from '@/types';
import TeacherRegistry from '@/components/TeacherRegistry';
import EnrollStudentForm from '@/components/EnrollStudentForm';
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
} from 'lucide-react';

export default function AdminHubPage() {
  const {
    schoolInfo,
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
  } = useApp();

  const [activeTab, setActiveTab] = useState<'roster' | 'receipts' | 'ledger' | 'teachers' | 'enroll' | 'notices' | 'admin-security'>('roster');
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
      author_name: 'Dr. Arthur Vance (Principal)',
      priority: annPriority,
    });
    setAnnTitle('');
    setAnnContent('');
    setAnnSuccess(true);
    setTimeout(() => setAnnSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4 text-amber-500" />
              <span>Nigerian Education Administration (33 Class Tiers: Creche – SS3 Arm F)</span>
            </div>
            <h1 className="text-3xl font-black text-gray-50 tracking-tight">Admin Command Center</h1>
            <p className="text-gray-400 text-sm mt-1">
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
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition cursor-pointer shadow-md ${
                resultsPublished
                  ? 'bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-600'
              }`}
              title={resultsPublished ? 'Results are live on Student Portal — Click to withdraw' : 'Click to review and publish official results'}
            >
              {resultsPublished ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Results Published to Student Hub</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-200" />
                  <span>Publish Term Results</span>
                </>
              )}
            </button>

            {publishToast && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-800 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{publishToast}</span>
              </span>
            )}

            <Link
              href="/admin/fees"
              className="px-4 py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center gap-2 border border-rose-800 transition cursor-pointer"
            >
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>School Fees & Receipt Hub</span>
              {pendingReceiptsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-gray-900 font-black text-[10px]">
                  {pendingReceiptsCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsPromoteModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 font-bold text-xs flex items-center gap-2 border border-gray-300 dark:border-gray-700 transition cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>Promote Class (e.g. SS1 → SS2)</span>
            </button>
          </div>
        </div>

        {/* Quick Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
            <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 text-xs font-semibold">
              <Building2 className="w-4 h-4" />
              <span>Total Classes</span>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-50 mt-2">{classes.length} Arms</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Creche to SS3 Arm F</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-xs font-semibold">
              <Users className="w-4 h-4 text-amber-500" />
              <span>Enrolled Students</span>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-50 mt-2">{students.length}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">All Registered Profiles</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              <UserCheck className="w-4 h-4" />
              <span>Faculty Teachers</span>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-50 mt-2">{teachers.length}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Assigned Staff Profiles</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
            <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 text-xs font-semibold">
              <DollarSign className="w-4 h-4" />
              <span>Pending Receipts</span>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-50 mt-2">{pendingReceiptsCount}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Awaiting Bursar Audit</p>
          </div>
        </div>

        {/* Master Student Search Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-gray-100">
              <Search className="w-4 h-4 text-amber-500" />
              <span>Master Student Dossier Lookup:</span>
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Instant query across all 33 class arms</span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search student by name or Reg No (e.g. Adeleke or STU-2026-089)..."
              value={masterSearchQuery}
              onChange={(e) => setMasterSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
            />
            {masterSearchQuery && (
              <button
                onClick={() => setMasterSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Instant Search Suggestions / Matches */}
          {masterSearchQuery.trim() !== '' && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/60 divide-y divide-gray-200 dark:divide-gray-800 max-h-60 overflow-y-auto">
              {students.filter(
                (s) =>
                  s.full_name.toLowerCase().includes(masterSearchQuery.toLowerCase()) ||
                  s.reg_number.toLowerCase().includes(masterSearchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 italic">
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
                        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-900 text-amber-300 font-bold text-xs flex items-center justify-center">
                            {std.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <span>{std.full_name}</span>
                              <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                {std.reg_number}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">
                              {std.class_grade} • Parent: {std.parent_name}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ledger.isUnlocked
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : ledger.paymentStatus === 'partially_paid'
                                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {ledger.isUnlocked
                              ? 'Paid'
                              : ledger.paymentStatus === 'partially_paid'
                              ? 'Partial'
                              : 'Unpaid'}
                          </span>
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'roster'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Roster & Audit Badges ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('receipts')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'receipts'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Receipt Verification Queue ({pendingReceiptsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Historical Debt Ledger ({transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('teachers')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'teachers'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Teacher Registry & Security ({teachers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('enroll')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'enroll'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Admin Dual Enrollment Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('notices')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'notices'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Publish School Announcements</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('admin-security');
              setAdminPassError(null);
              setAdminPassSuccess(false);
            }}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'admin-security'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Security & Password</span>
          </button>
        </div>

        {/* TAB 1: STUDENT ROSTER & DUAL AUDIT TRACKING BADGES */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-800 p-4 rounded-2xl border border-gray-700">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search name, Reg Number, parent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-64 placeholder:text-gray-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-gray-400 whitespace-nowrap">Filter Class:</span>
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-48 cursor-pointer"
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

            <div className="overflow-x-auto rounded-2xl border border-gray-700 bg-gray-800">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider text-[11px] border-b border-gray-700">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Reg No & PIN</th>
                    <th className="px-4 py-3">Class Arm</th>
                    <th className="px-4 py-3">Parent Info (+234)</th>
                    <th className="px-4 py-3">Enrollment Provenance</th>
                    <th className="px-4 py-3 text-center">Fee Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400 italic">
                        No student records match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std) => (
                      <tr key={std.id} className="hover:bg-gray-750 transition">
                        <td className="px-4 py-3 font-semibold text-gray-100">
                          <div>{std.full_name}</div>
                          <div className="text-[10px] text-gray-400 font-normal">Session: {std.session}</div>
                        </td>

                        <td className="px-4 py-3 font-mono">
                          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                            <span>{std.reg_number}</span>
                            <button
                              onClick={() => copyToClipboard(std.reg_number, `reg-${std.id}`)}
                              className="text-gray-400 hover:text-white"
                              title="Copy Reg Number"
                            >
                              {copiedId === `reg-${std.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-amber-500" />
                            <span>PIN: {std.access_pin}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-medium text-gray-200">
                          {std.class_grade}
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-gray-200">{std.parent_name}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{std.parent_phone}</div>
                        </td>

                        {/* Dual Enrollment Audit Provenance Badge */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                std.enrolled_by_role === 'Form Teacher'
                                  ? 'bg-gray-900 text-amber-300 border border-amber-600/40'
                                  : std.enrolled_by_role === 'Principal'
                                  ? 'bg-rose-900/60 text-rose-200 border border-rose-800'
                                  : 'bg-gray-900 text-gray-300 border border-gray-700'
                              }`}
                            >
                              {std.enrolled_by_role || 'Bursar'}
                            </span>
                            <div className="text-[11px] text-gray-300 truncate max-w-[140px]">
                              By: {std.enrolled_by_name || 'System Admin'}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              {std.enrollment_date
                                ? new Date(std.enrollment_date).toLocaleDateString('en-GB')
                                : 'Pre-seeded'}
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
                                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60'
                                      : ledger.paymentStatus === 'partially_paid'
                                      ? 'bg-amber-950/70 text-amber-300 border-amber-700 hover:bg-amber-900/60'
                                      : 'bg-rose-950/60 text-rose-400 border-rose-800 hover:bg-rose-900/60'
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
                                  <span className="text-[10px] font-mono text-amber-400">
                                    Debt: {formatNaira(ledger.remainingBalance)}
                                  </span>
                                )}
                                <button
                                  onClick={() => setSelectedStudentForLedger(std)}
                                  className="text-[10px] text-gray-400 hover:text-amber-400 underline font-semibold mt-0.5 cursor-pointer"
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
          </div>
        )}

        {/* TAB 2: RECEIPT VERIFICATION QUEUE */}
        {activeTab === 'receipts' && (
          <div className="space-y-4">
            <div className="p-6 rounded-3xl bg-gray-800 border border-gray-700 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gray-900 text-amber-400 border border-gray-700">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-50">Pending Receipt Verification Queue</h3>
                    <p className="text-xs text-gray-400">
                      Bursar 3-action verification: Confirm Full Payment, Mark Partial Payment, or Reject.
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/fees"
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                >
                  <span>Open Full Fees Desk</span>
                  <TrendingUp className="w-3.5 h-3.5" />
                </Link>
              </div>

              {receipts.filter((r) => r.status === 'pending_verification').length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-gray-400">No receipts pending verification.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-900 text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-700">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Class & Term</th>
                        <th className="px-4 py-3">Amount Claimed</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">Receipt Document</th>
                        <th className="px-4 py-3 text-center">3 Action Buttons</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
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
                            <tr key={r.id} className="hover:bg-gray-750 transition">
                              <td className="px-4 py-3">
                                <div className="font-bold text-gray-100">{r.student_name}</div>
                                <div className="font-mono text-gray-400 text-[10px]">{r.reg_number}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-300">
                                <div>{r.class_grade}</div>
                                <span className="text-[10px] text-amber-400 font-semibold">{rTerm}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-amber-400 font-bold">
                                {formatNaira(r.amount_claimed)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  r.payment_mode === 'partial'
                                    ? 'bg-amber-950/70 text-amber-300 border border-amber-700'
                                    : 'bg-emerald-950/70 text-emerald-300 border border-emerald-700'
                                }`}>
                                  {r.payment_mode === 'partial' ? 'Partial' : 'Full'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-gray-300 text-xs font-mono">{r.file_name}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
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
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-sm"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
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
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition"
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
            <div className="p-6 rounded-3xl bg-gray-800 border border-gray-700 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-700">
                <div className="p-2.5 rounded-2xl bg-gray-900 text-amber-400 border border-gray-700">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-50">Historical Payment Breakdown & Remaining Debt Ledger</h3>
                  <p className="text-xs text-gray-400">
                    Comprehensive ledger of credited payment transactions, transaction timestamps, and remaining balance due per pupil.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-700 bg-gray-900">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950 text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-800">
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
                  <tbody className="divide-y divide-gray-800">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-850 transition">
                        <td className="px-4 py-3 font-mono text-gray-400 text-[11px]">
                          {new Date(tx.transaction_date).toLocaleDateString('en-NG', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                          <span className="block text-[10px] text-gray-500">
                            {new Date(tx.transaction_date).toLocaleTimeString('en-NG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-100">{tx.student_name}</div>
                          <div className="font-mono text-amber-400 text-[10px]">{tx.reg_number}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          <div>{tx.class_grade}</div>
                          <span className="text-[10px] text-gray-400 font-semibold">{tx.term}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tx.payment_type === 'full'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                          }`}>
                            {tx.payment_type === 'full' ? 'Full Settlement' : 'Partial Deposit'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400 text-sm">
                          +{formatNaira(tx.amount_credited)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold text-sm ${
                          tx.remaining_debt === 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {formatNaira(tx.remaining_debt)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-[11px]">
                          <span className="text-gray-300 block">{tx.verified_by || 'Bursary Desk'}</span>
                          <span className="text-[10px] italic text-gray-500">{tx.note || 'Confirmed'}</span>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500 italic">
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
              defaultEnrolledByName="Dr. Arthur Vance (Principal)"
              title="Principal / Admin Student Enrollment"
              description="Directly register new pupils into any of the 33 classes (Creche to SS3 Arm F) with automatic audit tracking provenance."
            />
          </div>
        )}

        {/* TAB 6: PUBLISH ANNOUNCEMENTS */}
        {activeTab === 'notices' && (
          <div className="max-w-2xl mx-auto p-6 bg-gray-800 border border-gray-700 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold uppercase tracking-wider">
              <Send className="w-4 h-4 text-amber-500" />
              <span>Broadcast Notice</span>
            </div>
            <h2 className="text-xl font-bold text-gray-50">Publish School Announcement</h2>
            <p className="text-xs text-gray-400">
              Notices appear instantly on all student report portals and teacher academic dashboards.
            </p>

            <form onSubmit={handleBroadcast} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notice Title:</label>
                <input
                  type="text"
                  placeholder="e.g. 1st Term Mid-Term Break & CA Test Schedule"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Priority Level:</label>
                <select
                  value={annPriority}
                  onChange={(e) => setAnnPriority(e.target.value as any)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="normal">Normal Announcement</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notice Body:</label>
                <textarea
                  rows={4}
                  placeholder="Full announcement details visible immediately to parents and pupils..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-2 border border-rose-800 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Broadcast to School Portals</span>
              </button>

              {annSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Announcement published successfully and live on all hubs!</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* TAB 7: ADMIN MASTER PASSWORD & SECURITY SETTINGS */}
        {activeTab === 'admin-security' && (
          <div className="max-w-xl mx-auto my-8 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700 transition-colors duration-200 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
                  Admin Master Password Settings
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Update your system administrator login credentials and security parameters.
                </p>
              </div>
            </div>

            {adminPassError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{adminPassError}</span>
              </div>
            )}

            {adminPassSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-sm">Master Password Successfully Updated!</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
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
                  className="mt-2 px-5 py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-white font-bold text-xs cursor-pointer shadow-md transition"
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
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1.5">
                    Current Password:
                  </label>
                  <input
                    type="password"
                    required
                    value={adminCurrentPass}
                    onChange={(e) => setAdminCurrentPass(e.target.value)}
                    placeholder="Enter current password (default: admin123)"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1.5">
                    New Password (min 6 characters):
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={adminNewPass}
                    onChange={(e) => setAdminNewPass(e.target.value)}
                    placeholder="Enter new master password"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1.5">
                    Confirm New Password:
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={adminConfirmPass}
                    onChange={(e) => setAdminConfirmPass(e.target.value)}
                    placeholder="Re-enter new master password"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-rose-900 hover:bg-rose-800 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-rose-800 transition cursor-pointer shadow-md mt-4"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Update Master Password</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* PROMOTE CLASS MODAL */}
        {isPromoteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-gray-100 shadow-2xl relative">
              <button
                onClick={() => {
                  setIsPromoteModalOpen(false);
                  setPromoteNotice(null);
                }}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg bg-gray-900 border border-gray-700 cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-2xl bg-gray-900 text-amber-400 border border-gray-700">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-50">Promote Class Level</h3>
                  <p className="text-xs text-gray-400">
                    Advance all students across tiers (e.g. JSS 3 → SS1 Arm A, SS1 Arm A → SS2 Arm A).
                  </p>
                </div>
              </div>

              {promoteNotice && (
                <div
                  className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 ${
                    promoteNotice.success
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                  }`}
                >
                  {promoteNotice.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{promoteNotice.message}</span>
                </div>
              )}

              <form onSubmit={handlePromoteClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    1. Current Source Class (Promote From):
                  </label>
                  <select
                    value={fromClassId}
                    onChange={(e) => setFromClassId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-100 focus:ring-1 focus:ring-amber-500 cursor-pointer"
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
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    2. Destination Next Class (Promote To):
                  </label>
                  <select
                    value={toClassId}
                    onChange={(e) => setToClassId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-100 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Session {cls.session})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preview Students */}
                <div className="p-3 bg-gray-900 border border-gray-700 rounded-xl text-xs space-y-1.5">
                  <span className="font-semibold text-gray-400 block text-[11px] uppercase tracking-wider">
                    Students to be advanced ({studentsInSourceClass.length}):
                  </span>
                  {studentsInSourceClass.length === 0 ? (
                    <p className="text-gray-500 italic">No students currently in selected source class.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {studentsInSourceClass.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300 text-[11px]"
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
                    className="w-full py-3.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-2 border border-rose-800 transition cursor-pointer disabled:opacity-50"
                  >
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Confirm Promotion of Students</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Detailed Student Debt & Historical Transactions Ledger */}
        {selectedStudentForLedger && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-2xl w-full p-6 sm:p-7 text-gray-100 shadow-2xl relative space-y-5">
              <button
                onClick={() => setSelectedStudentForLedger(null)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg bg-gray-900 border border-gray-700 cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gray-900 text-amber-400 border border-gray-700">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-50">Student Debt & Payment History Ledger</h3>
                  <p className="text-xs text-gray-400">
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
                      <div className="p-3 rounded-2xl bg-gray-900 border border-gray-700 text-center">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase block">Total Term Fee</span>
                        <span className="text-sm font-black text-gray-100 font-mono mt-0.5 block">
                          {formatNaira(ledger.totalTermFee)}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-gray-900 border border-gray-700 text-center">
                        <span className="text-[10px] text-emerald-400 font-semibold uppercase block">Total Credited</span>
                        <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">
                          {formatNaira(ledger.totalPaid)}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-gray-900 border border-gray-700 text-center">
                        <span className="text-[10px] text-amber-400 font-semibold uppercase block">Remaining Debt</span>
                        <span className={`text-sm font-black font-mono mt-0.5 block ${
                          ledger.remainingBalance === 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {formatNaira(ledger.remainingBalance)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-between text-xs">
                      <span className="text-gray-400">Result Slip Download Status:</span>
                      <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                        ledger.isUnlocked
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {ledger.isUnlocked ? 'Unlocked (Full Payment Cleared)' : 'Locked (Remaining Debt > ₦0)'}
                      </span>
                    </div>

                    {/* Historical Transactions List */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                        Credited Transactions ({studentTx.length})
                      </span>
                      {studentTx.length === 0 ? (
                        <p className="text-xs text-gray-500 italic p-4 bg-gray-900 rounded-xl text-center">
                          No payments recorded yet for this student.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {studentTx.map((tx) => (
                            <div
                              key={tx.id}
                              className="p-3 rounded-xl bg-gray-900 border border-gray-700 text-xs flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-gray-200 block">
                                  {tx.payment_type === 'full' ? 'Full Settlement' : 'Partial Deposit'} — {tx.term}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {new Date(tx.transaction_date).toLocaleDateString('en-NG')} at{' '}
                                  {new Date(tx.transaction_date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-emerald-400 block text-sm">
                                  +{formatNaira(tx.amount_credited)}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
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
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-md w-full p-6 text-gray-100 shadow-2xl space-y-5 relative">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-700">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-50">Confirm Full Fee Settlement</h3>
                  <p className="text-xs text-gray-400">Mark Term as Paid in Full & Unlock Result Slip</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-900 border border-gray-700 space-y-2 text-xs">
                <p className="text-gray-200 text-sm font-semibold leading-relaxed">
                  Confirm complete fee clearance for{' '}
                  <span className="text-amber-400 font-bold">{confirmFullModalReceipt.studentName}</span> (
                  <span className="text-emerald-300 font-bold">{confirmFullModalReceipt.term}</span>)?
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-gray-400 text-[11px]">
                  <span>Reg: <strong className="text-white font-mono">{confirmFullModalReceipt.regNumber}</strong></span>
                  <span>Claimed: <strong className="text-amber-400 font-mono">{formatNaira(confirmFullModalReceipt.amount)}</strong></span>
                </div>
                <p className="text-[11px] text-emerald-400 pt-1">
                  ✓ Student remaining balance will be zeroed out (₦0.00). Official Result Slip will UNLOCK immediately.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmFullModalReceipt(null)}
                  className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-700 text-gray-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-700 transition cursor-pointer"
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
                  className="w-full py-3 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-emerald-100 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-700 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Confirm Paid in Full</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Mark Partial Payment Modal */}
        {partialModalReceipt && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-lg w-full p-6 text-gray-100 shadow-2xl space-y-5 relative">
              <button
                onClick={() => setPartialModalReceipt(null)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg bg-gray-900 border border-gray-700 cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-950/80 text-amber-400 border border-amber-700">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-50">Authorize Partial Payment Deposit</h3>
                  <p className="text-xs text-gray-400">
                    {partialModalReceipt.studentName} ({partialModalReceipt.regNumber}) • {partialModalReceipt.term}
                  </p>
                </div>
              </div>

              {/* 3 Clear Highlight Cards: Amount Claimed, Previous Debt, New Remaining Balance */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-gray-900 border border-gray-700 text-center">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block">Amount Claimed</span>
                  <span className="text-sm font-black text-amber-400 font-mono mt-0.5 block">
                    {formatNaira(partialModalReceipt.amountClaimed)}
                  </span>
                  <span className="text-[9px] text-gray-500">Student Deposit</span>
                </div>

                <div className="p-3 rounded-2xl bg-gray-900 border border-gray-700 text-center">
                  <span className="text-[10px] text-rose-300 font-semibold uppercase block">Previous Debt</span>
                  <span className="text-sm font-black text-rose-300 font-mono mt-0.5 block">
                    {formatNaira(partialModalReceipt.previousDebt)}
                  </span>
                  <span className="text-[9px] text-gray-500">Before Verification</span>
                </div>

                <div className="p-3 rounded-2xl bg-gray-900 border border-gray-700 text-center">
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase block">New Balance</span>
                  <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">
                    {formatNaira(partialModalReceipt.newRemainingBalance)}
                  </span>
                  <span className="text-[9px] text-gray-500">Remaining Debt</span>
                </div>
              </div>

              {/* Editable deposit credit input */}
              <div className="p-4 rounded-2xl bg-gray-900 border border-gray-700 space-y-3 text-xs">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Verified Deposit to Credit (₦):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-mono font-bold">₦</span>
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
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px] flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 text-amber-400" />
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
                  className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-700 text-gray-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-700 transition cursor-pointer"
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
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-md w-full p-6 text-gray-100 shadow-2xl space-y-5 relative">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-950/80 text-rose-400 border border-rose-800">
                  <X className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-50">Reject Payment Receipt</h3>
                  <p className="text-xs text-gray-400">
                    {rejectModalReceipt.studentName} ({rejectModalReceipt.regNumber}) • {rejectModalReceipt.term}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-gray-300">
                  State the reason why this bank transfer proof is rejected. The student will be prompted to re-upload.
                </p>
                <textarea
                  rows={3}
                  value={customRejectNote}
                  onChange={(e) => setCustomRejectNote(e.target.value)}
                  placeholder="e.g. Incomplete transfer reference or blurred bank receipt..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setRejectModalReceipt(null)}
                  className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-700 text-gray-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-700 transition cursor-pointer"
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
                  className="w-full py-3 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4 text-amber-400" />
                  <span>Reject & Request Re-upload</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: Student Master Dossier Modal */}
        {selectedStudentForDossier && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl max-w-2xl w-full p-6 text-gray-900 dark:text-gray-100 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedStudentForDossier(null)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg bg-gray-100 dark:bg-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Dossier Header */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-900 border border-rose-800 flex items-center justify-center text-amber-300 font-black text-2xl shadow-md shrink-0">
                  {selectedStudentForDossier.full_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold">
                      {selectedStudentForDossier.reg_number}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-900 text-amber-300 font-semibold">
                      PIN: {selectedStudentForDossier.access_pin}
                    </span>
                    <span className="text-xs text-gray-500">Session {selectedStudentForDossier.session}</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-gray-50 mt-1">
                    {selectedStudentForDossier.full_name}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Parent: {selectedStudentForDossier.parent_name} • {selectedStudentForDossier.parent_phone}
                  </p>
                </div>
              </div>

              {/* 3 Pillars: Enrollment Provenance, Academic Placement, Financial Ledger */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Enrollment Provenance */}
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    1. Enrollment Provenance
                  </span>
                  <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Enrolled By: <span className="text-rose-700 dark:text-rose-300">{selectedStudentForDossier.enrolled_by_role || 'System'}</span>
                  </div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-400">
                    Staff: {selectedStudentForDossier.enrolled_by_name || 'Dr. Arthur Vance'}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    Timestamp: {selectedStudentForDossier.enrollment_date || selectedStudentForDossier.created_at || 'Pre-seeded'}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                    {selectedStudentForDossier.ndpa_consent_granted ? '✓ NDPA 2023 Consented' : 'Standard Shield'}
                  </div>
                </div>

                {/* 2. Academic Placement */}
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    2. Academic Placement
                  </span>
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {selectedStudentForDossier.class_grade}
                  </div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-400">
                    Term: 1st Term Assessment
                  </div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-400">
                    Cumulative GPA: <strong className="text-amber-600 dark:text-amber-400">{selectedStudentForDossier.gpa.toFixed(2)}</strong>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    Attendance: {selectedStudentForDossier.attendance_percentage}%
                  </div>
                </div>

                {/* 3. Financial Ledger Status */}
                {(() => {
                  const ledger = getStudentTermLedger(selectedStudentForDossier.id, '1st Term');
                  return (
                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                        3. Financial Ledger (₦)
                      </span>
                      <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex justify-between">
                        <span>Total Due:</span>
                        <span className="font-mono">{formatNaira(ledger.totalTermFee)}</span>
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex justify-between">
                        <span>Paid:</span>
                        <span className="font-mono">{formatNaira(ledger.totalPaid)}</span>
                      </div>
                      <div className="text-xs text-rose-600 dark:text-rose-400 font-bold flex justify-between">
                        <span>Debt:</span>
                        <span className="font-mono">{formatNaira(ledger.remainingBalance)}</span>
                      </div>
                      <div className="pt-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ledger.isUnlocked
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                              : ledger.paymentStatus === 'partially_paid'
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
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
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <span>Continuous Assessment & Examination Marks (1st Term)</span>
                  </h4>
                  <span className="text-[11px] text-gray-500">WAEC Matrix: CA1 (20) + CA2 (20) + Exam (60) = 100</span>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
                  {results.filter((r) => r.student_id === selectedStudentForDossier.id && r.term === '1st Term').length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-500 italic">
                      No examination scores recorded for this student in 1st Term yet.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-800/90 text-gray-600 dark:text-gray-400 uppercase text-[10px] border-b border-gray-200 dark:border-gray-700">
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
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {results
                          .filter((r) => r.student_id === selectedStudentForDossier.id && r.term === '1st Term')
                          .map((res) => {
                            const sub = subjects.find((s) => s.id === res.subject_id);
                            return (
                              <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="px-4 py-2 font-semibold text-gray-900 dark:text-gray-100">
                                  {sub?.name || res.subject_id}
                                </td>
                                <td className="px-3 py-2 text-center font-mono text-gray-700 dark:text-gray-300">{res.ca1}</td>
                                <td className="px-3 py-2 text-center font-mono text-gray-700 dark:text-gray-300">{res.ca2}</td>
                                <td className="px-3 py-2 text-center font-mono text-gray-700 dark:text-gray-300">{res.exam}</td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-gray-900 dark:text-gray-50">
                                  {res.total_score}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      res.grade === 'A'
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                        : res.grade === 'B'
                                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                        : res.grade === 'C'
                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                    }`}
                                  >
                                    {res.grade}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-[10px] text-gray-500 font-mono">
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
                  className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  <span>View Full Transaction Ledger</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStudentForDossier(null)}
                  className="px-5 py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs transition cursor-pointer shadow-sm"
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
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 relative max-h-[90vh] overflow-y-auto my-auto space-y-5 transition-colors duration-200">
              <button
                onClick={() => setIsPublishConfirmModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg bg-gray-100 dark:bg-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">
                    Publish Official Term Results?
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    Institutional Result Release Gate
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                This action will release official terminal result sheets live to all students who have satisfied term fee clearance (<strong>Paid in Full</strong>). Students with outstanding fee debts will continue to see their result downloads locked until their balance is cleared. Are you sure you want to proceed?
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPublishConfirmModalOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 font-semibold text-xs transition cursor-pointer"
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
                  className="w-full py-2.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Confirm & Publish</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
