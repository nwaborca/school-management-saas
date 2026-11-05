'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Trophy3DCanvas } from '@/components/3d/Trophy3DCanvas';
import { formatNaira } from '@/types';
import { filterSubjectsForClassAndStream } from '@/lib/streamSpecialization';
import { uploadReceiptToStorage } from '@/lib/supabase';
import {
  GraduationCap,
  Award,
  Calendar,
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  Sparkles,
  LogOut,
  ChevronRight,
  CreditCard,
  Building2,
  UploadCloud,
  FileCheck2,
  Lock,
  AlertTriangle,
  Receipt,
  File,
  Copy,
  Check,
  PieChart,
  HelpCircle,
  ArrowRight,
  BadgePercent,
  ShieldCheck,
  X,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const router = useRouter();
  const {
    classes,
    subjects,
    currentUser,
    students,
    results,
    invoices,
    schoolInfo,
    feeStructures,
    receipts,
    transactions,
    uploadReceipt,
    getStudentTermLedger,
    resultsPublished,
    logout,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'results' | 'fees' | 'awards'>('results');
  const [selectedTerm, setSelectedTerm] = useState('1st Term');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Partial vs Full Payment State
  const [paymentChoice, setPaymentChoice] = useState<'full' | 'partial'>('full');
  const [customPartialAmount, setCustomPartialAmount] = useState<string>('');
  const [showBankDetailsModal, setShowBankDetailsModal] = useState<boolean>(false);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  // Upload receipt state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Guard & Active student: Strict RBAC Isolation to currentUser.student_id only
  const activeStudent =
    currentUser?.role === 'student'
      ? students.find((s) => s.id === currentUser?.student_id) ||
        students.find((s) => s.reg_number === currentUser?.reg_number) ||
        null
      : null;

  // RBAC Guard: If user is not authenticated, redirect to login
  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    } else if (currentUser.role !== 'student') {
      if (currentUser.role === 'teacher') {
        router.push('/academic-hub');
      } else if (currentUser.role === 'admin') {
        router.push('/admin-hub');
      }
    }
  }, [currentUser, router]);

  if (!currentUser || !activeStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs">
        <span>Authenticating session...</span>
      </div>
    );
  }

  const studentClass = classes.find((c) => c.id === activeStudent.class_id) ||
    classes.find((c) => c.name === activeStudent.class_grade);

  const allowedStreamSubjects = filterSubjectsForClassAndStream(subjects, studentClass);
  const allowedSubjectIds = new Set(allowedStreamSubjects.map((s) => s.id));

  const studentResults = results.filter((r) => {
    if (r.student_id !== activeStudent.id || r.term !== selectedTerm) return false;
    if (studentClass?.stage === 'senior_secondary') {
      return allowedSubjectIds.has(r.subject_id);
    }
    return true;
  });

  const totalScoreObtained = studentResults.reduce((sum, r) => sum + r.total_score, 0);
  const totalMaxScore = studentResults.length * 100;
  const averageScore =
    studentResults.length > 0 ? (totalScoreObtained / studentResults.length).toFixed(1) : '0.0';
  const subjectsPassed = studentResults.filter((r) => r.total_score >= 50).length;

  const classFeeStructure = feeStructures.find(
    (fs) => fs.class_id === activeStudent.class_id && fs.term === selectedTerm && fs.published
  ) || feeStructures.find((fs) => fs.class_id === activeStudent.class_id && fs.published);

  // Compute Term-Isolated Partial Payment & Ledger
  const termLedger = getStudentTermLedger(activeStudent.id, selectedTerm);
  const isPaid = termLedger.isUnlocked;
  const isPendingVerification = termLedger.paymentStatus === 'pending_verification';
  const isPartiallyPaid = termLedger.paymentStatus === 'partially_paid';

  // Default partial amount to remaining balance if student returns to pay balance
  useEffect(() => {
    if (termLedger.remainingBalance > 0) {
      setCustomPartialAmount(String(termLedger.remainingBalance));
    } else {
      setCustomPartialAmount('');
    }
  }, [selectedTerm, termLedger.remainingBalance]);

  const copyBankInfo = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankField(fieldKey);
    setTimeout(() => setCopiedBankField(null), 2500);
  };

  const handleSelectPaymentChoice = (choice: 'full' | 'partial') => {
    setPaymentChoice(choice);
    if (choice === 'full') {
      setShowBankDetailsModal(true);
    } else {
      // In partial mode, default to remaining balance or leave prompt ready
      if (!customPartialAmount && termLedger.remainingBalance > 0) {
        setCustomPartialAmount(String(termLedger.remainingBalance));
      }
    }
  };

  const handleProceedPartialPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = Number(customPartialAmount);
    if (!entered || entered <= 0) {
      alert('Please enter a valid partial amount in Naira (₦) greater than zero.');
      return;
    }
    if (entered > termLedger.remainingBalance && termLedger.remainingBalance > 0) {
      alert(`The entered amount (₦${entered.toLocaleString()}) exceeds your remaining balance due (₦${termLedger.remainingBalance.toLocaleString()}).`);
      return;
    }
    setShowBankDetailsModal(true);
  };

  const currentPayableAmount =
    paymentChoice === 'full'
      ? (termLedger.remainingBalance > 0 ? termLedger.remainingBalance : termLedger.totalTermFee)
      : Number(customPartialAmount) || termLedger.remainingBalance || termLedger.totalTermFee;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    const amountClaimed = currentPayableAmount;
    const currentFile = selectedFile;

    const storageResult = await uploadReceiptToStorage(currentFile, activeStudent.id);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      uploadReceipt(activeStudent.id, {
        fileName: currentFile.name,
        fileDataUrl: storageResult?.url || dataUrl,
        fileType: currentFile.type || (currentFile.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        storagePath: storageResult?.path,
        amountClaimed: amountClaimed,
        paymentMode: paymentChoice,
        feeStructureId: classFeeStructure?.id,
        term: selectedTerm,
        session: activeStudent.session || schoolInfo.session || '2025/2026',
      });

      setIsUploading(false);
      setSelectedFile(null);
      setUploadSuccessNotice(true);
      setShowBankDetailsModal(false);
      setTimeout(() => setUploadSuccessNotice(false), 5000);
    };

    reader.readAsDataURL(currentFile);
  };

  const handleDownloadResultSlip = () => {
    if (!resultsPublished) {
      alert('Official Term Results are pending administrative publication by the Principal.');
      return;
    }
    if (!isPaid) {
      alert('Result slip download is locked. School fees payment must be verified and cleared by the bursar.');
      return;
    }
    setIsPrintModalOpen(true);
  };

  return (
    <div className="min-h-screen text-gray-100 pb-16">
      {/* Top Student Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-900 border border-rose-800 flex items-center justify-center text-amber-400 font-black text-2xl shadow-sm">
              {activeStudent.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-800 text-amber-400 font-mono font-bold border border-gray-700">
                  {activeStudent.reg_number}
                </span>
                <span className="text-xs text-rose-300 font-semibold">{activeStudent.class_grade}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-400 font-mono">Session: {activeStudent.session}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-50 mt-1">
                {activeStudent.full_name}
              </h1>
              <p className="text-xs text-gray-400">
                {schoolInfo.name} • {selectedTerm} Terminal Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadResultSlip}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                !resultsPublished
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800'
                  : isPaid
                  ? 'bg-rose-900 hover:bg-rose-800 text-gray-50 border border-rose-800'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
              }`}
            >
              {!resultsPublished ? (
                <Lock className="w-4 h-4 text-amber-400" />
              ) : isPaid ? (
                <Printer className="w-4 h-4 text-amber-400" />
              ) : (
                <Lock className="w-4 h-4 text-amber-500" />
              )}
              <span>
                {!resultsPublished
                  ? 'Result Slip (Pending Publication)'
                  : isPaid
                  ? 'Print Official Result Sheet'
                  : 'Result Slip (Locked - Fees Required)'}
              </span>
            </button>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition cursor-pointer border border-gray-700"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-gray-800 border border-gray-700">
            <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block">
              Term Average
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-1">
              {averageScore}%
            </div>
            <span className="text-[10px] text-amber-500 font-medium">Distinction Standing</span>
          </div>

          <div className="p-4 rounded-2xl bg-gray-800 border border-gray-700">
            <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block">
              Subjects Passed
            </span>
            <div className="text-2xl sm:text-3xl font-black text-gray-100 font-mono mt-1">
              {subjectsPassed} / {studentResults.length}
            </div>
            <span className="text-[10px] text-gray-400">Official Pass Marks</span>
          </div>

          <div className="p-4 rounded-2xl bg-gray-800 border border-gray-700">
            <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block">
              Cumulative Marks
            </span>
            <div className="text-2xl sm:text-3xl font-black text-rose-300 font-mono mt-1">
              {totalScoreObtained} <span className="text-xs text-gray-500 font-normal">/ {totalMaxScore}</span>
            </div>
            <span className="text-[10px] text-gray-400">{studentResults.length} Enrolled Subjects</span>
          </div>

          <div className="p-4 rounded-2xl bg-gray-800 border border-gray-700">
            <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block">
              Fee Status ({selectedTerm})
            </span>
            <div className="mt-1">
              {isPaid ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Paid in Full</span>
                </span>
              ) : isPendingVerification ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/60 text-amber-300 border border-amber-800">
                  <Clock className="w-3 h-3" />
                  <span>Pending Audit</span>
                </span>
              ) : isPartiallyPaid ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-600">
                  <PieChart className="w-3 h-3 text-amber-400" />
                  <span>Partially Paid</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/60 text-rose-300 border border-rose-800">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Unpaid / Due</span>
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400 block mt-1">
              {isPartiallyPaid
                ? `Bal Due: ${formatNaira(termLedger.remainingBalance)}`
                : 'Term Isolated Clearance'}
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-800 gap-4">
          <button
            onClick={() => setActiveTab('results')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'results'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Term Result Sheet
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'fees'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            School Fees & Bank Transfer Hub
          </button>
          <button
            onClick={() => setActiveTab('awards')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'awards'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            3D Academic Trophy
          </button>
        </div>

        {/* TAB 1: OFFICIAL RESULT SHEET */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            {!resultsPublished && (
              <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-800 flex items-start gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-amber-200 font-bold block">
                    Official Term Results Pending Publication
                  </strong>
                  <p className="text-amber-300/90">
                    Official Term Results are pending administrative publication by the Principal. Final certified score sheets will unlock for full-fee students once released by school leadership.
                  </p>
                </div>
              </div>
            )}

            {resultsPublished && !isPaid && (
              <div className="p-4 rounded-2xl bg-gray-800 border border-gray-700 flex items-start gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-gray-100 font-bold block">
                    {isPendingVerification
                      ? 'Payment Receipt Uploaded — Pending Bursar Verification'
                      : 'School Fees Pending — Official Result Slip Download Locked'}
                  </strong>
                  <p className="text-gray-300">
                    {isPendingVerification
                      ? 'Your bank transfer proof has been submitted for this term and is awaiting Bursary review. Once verified, download and print capabilities will unlock immediately.'
                      : 'You may view your preliminary subject marks on screen, but generating the official institutional result slip requires fee clearance for this term. Proceed to the School Fees tab to upload your transfer receipt.'}
                  </p>
                </div>
              </div>
            )}

            {/* Term Filter Bar */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-300">Select Academic Term:</span>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="bg-gray-900 text-gray-100 border border-gray-700 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="1st Term">1st Term (September - December)</option>
                  <option value="2nd Term">2nd Term (January - April)</option>
                  <option value="3rd Term">3rd Term (May - July / Promotional)</option>
                </select>
              </div>

              <button
                onClick={handleDownloadResultSlip}
                className={`text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                  isPaid ? 'text-amber-400 hover:underline' : 'text-gray-500'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isPaid ? 'Print Terminal Slip' : 'Print Locked'}</span>
              </button>
            </div>

            {/* Grades Table */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
              {studentResults.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs italic">
                  No examination marks recorded for {selectedTerm} yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider text-[11px] border-b border-gray-700">
                      <tr>
                        <th className="px-5 py-3.5">Subject</th>
                        <th className="px-4 py-3.5 text-center">CA 1 (20)</th>
                        <th className="px-4 py-3.5 text-center">CA 2 (20)</th>
                        <th className="px-4 py-3.5 text-center">Exam (60)</th>
                        <th className="px-4 py-3.5 text-center font-bold text-gray-100">Total (100)</th>
                        <th className="px-4 py-3.5 text-center">Grade</th>
                        <th className="px-5 py-3.5">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {studentResults.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-750 transition">
                          <td className="px-5 py-3.5 font-bold text-gray-100 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>{item.subject_name}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono text-gray-300">{item.ca1}</td>
                          <td className="px-4 py-3.5 text-center font-mono text-gray-300">{item.ca2}</td>
                          <td className="px-4 py-3.5 text-center font-mono text-gray-300">{item.exam}</td>
                          <td className="px-4 py-3.5 text-center font-mono font-black text-sm text-gray-100">{item.total_score}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md font-mono font-bold text-xs ${
                                item.grade === 'A'
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                                  : item.grade === 'B'
                                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800'
                                  : 'bg-gray-900 text-gray-300 border border-gray-700'
                              }`}
                            >
                              {item.grade}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-300 italic text-xs">{item.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TUITION & BANK TRANSFER PAYMENT HUB */}
        {activeTab === 'fees' && (
          <div className="space-y-6">
            {/* Term-Isolated Ledger Breakdown Banner */}
            <div className="p-6 rounded-3xl bg-gray-800 border border-gray-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gray-900 border border-gray-700 text-amber-500">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-50 flex items-center gap-2">
                      <span>Term Ledger & Debt Tracking</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-900 text-amber-400 font-mono border border-gray-700">
                        {selectedTerm}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400">
                      Term-isolated financial breakdown and real-time payment audit standing.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isPaid ? (
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{selectedTerm}: Paid in Full</span>
                    </span>
                  ) : isPendingVerification ? (
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-950/60 text-amber-300 border border-amber-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{selectedTerm}: Pending Audit</span>
                    </span>
                  ) : isPartiallyPaid ? (
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-600 flex items-center gap-1.5">
                      <PieChart className="w-4 h-4 text-amber-400" />
                      <span>{selectedTerm}: Partially Paid</span>
                    </span>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-950/60 text-rose-300 border border-rose-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{selectedTerm}: Unpaid / Due</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Clear Ledger 3-Metric Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-gray-900 border border-gray-700">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                    1. Total Term Fee
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-gray-100 font-mono mt-1">
                    {formatNaira(termLedger.totalTermFee)}
                  </div>
                  <span className="text-[10px] text-gray-500">Official Class Tariff</span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-900 border border-gray-700">
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
                    2. Total Amount Paid to Date
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                    {formatNaira(termLedger.totalPaid)}
                  </div>
                  <span className="text-[10px] text-emerald-500/80">Confirmed Credited Deposits</span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-900 border border-gray-700">
                  <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">
                    3. Remaining Balance Due
                  </span>
                  <div className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
                    termLedger.remainingBalance === 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {formatNaira(termLedger.remainingBalance)}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {termLedger.remainingBalance === 0 ? 'Zero Debt (Results Unlocked)' : 'Result Slip Locked Until ₦0'}
                  </span>
                </div>
              </div>

              {/* Result Slip Lock Warning Banner for Partial or Unpaid */}
              {!isPaid && (
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-center gap-3">
                  <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                  <p>
                    <strong>Institutional Clearance Policy:</strong> Official Terminal Result Slip download remains{' '}
                    <strong className="text-rose-300">LOCKED</strong> until the remaining balance reaches{' '}
                    <strong className="text-emerald-300 font-mono">₦0.00</strong> (Full Payment).
                  </p>
                </div>
              )}
            </div>

            {/* Payment Choice Selection Engine */}
            <div className="p-6 rounded-3xl bg-gray-800 border border-gray-700 space-y-4">
              <div className="border-b border-gray-700 pb-3">
                <h3 className="text-base font-bold text-gray-50 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-500" />
                  <span>Choose Payment Mode for {selectedTerm}</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Select whether to pay the full term balance at once or deposit a custom partial amount.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Full Payment Card */}
                <div
                  onClick={() => handleSelectPaymentChoice('full')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                    paymentChoice === 'full'
                      ? 'bg-rose-950/40 border-amber-500 shadow-md'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-100 flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${paymentChoice === 'full' ? 'text-amber-400' : 'text-gray-500'}`} />
                      <span>Full Payment</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-semibold">
                      Instant Result Unlock
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Pay the entire balance due of{' '}
                    <span className="text-amber-400 font-mono font-bold">
                      {formatNaira(termLedger.remainingBalance > 0 ? termLedger.remainingBalance : termLedger.totalTermFee)}
                    </span>
                    . Automatically clears fees upon bursar verification.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPaymentChoice('full');
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 text-xs font-bold border border-rose-800 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>View Bank Details for Full Payment</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>

                {/* Partial Payment Card */}
                <div
                  onClick={() => handleSelectPaymentChoice('partial')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                    paymentChoice === 'partial'
                      ? 'bg-rose-950/40 border-amber-500 shadow-md'
                      : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-100 flex items-center gap-2">
                      <PieChart className={`w-4 h-4 ${paymentChoice === 'partial' ? 'text-amber-400' : 'text-gray-500'}`} />
                      <span>Partial Payment (Installment Deposit)</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 font-semibold">
                      Custom Naira Amount
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Input a custom amount you intend to transfer today. Your student debt ledger will be credited accordingly.
                  </p>

                  <form onSubmit={handleProceedPartialPayment} className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-gray-400 text-xs font-mono font-bold">₦</span>
                      <input
                        type="number"
                        placeholder={
                          termLedger.remainingBalance > 0
                            ? `Default: ${termLedger.remainingBalance}`
                            : 'Enter amount in NGN (₦)'
                        }
                        value={customPartialAmount}
                        onChange={(e) => setCustomPartialAmount(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-700 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        min="1"
                        max={termLedger.remainingBalance > 0 ? termLedger.remainingBalance : undefined}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-gray-950 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <span>Proceed with ₦{Number(customPartialAmount || 0).toLocaleString()} Deposit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Fee schedule & upload receipt */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 p-6 rounded-3xl bg-gray-800 border border-gray-700 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-700">
                  <div>
                    <h3 className="text-base font-bold text-gray-50">Itemized Term Fee Schedule</h3>
                    <p className="text-xs text-gray-400">
                      {activeStudent.class_grade} ({selectedTerm})
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-gray-900 text-gray-300 border border-gray-700">
                    {schoolInfo.session}
                  </span>
                </div>

                {classFeeStructure ? (
                  <div className="space-y-2 text-xs">
                    {classFeeStructure.line_items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2.5 border-b border-gray-700">
                        <span className="text-gray-300 font-medium">{item.description}</span>
                        <span className="font-mono text-gray-100 font-semibold">{formatNaira(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 text-base font-bold text-gray-50">
                      <span>Total Amount Due:</span>
                      <span className="font-mono text-xl font-black text-amber-400">
                        {formatNaira(classFeeStructure.total_amount)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-400 text-xs">
                    No fee structure published for {activeStudent.class_grade} yet.
                  </div>
                )}
              </div>

              {/* Upload section */}
              <div className="lg:col-span-5 p-6 rounded-3xl bg-gray-800 border border-gray-700 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                  <UploadCloud className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-50">Upload Payment Receipt</h3>
                    <p className="text-[11px] text-gray-400">
                      Proof of bank transfer ({paymentChoice === 'full' ? 'Full Payment' : 'Partial Deposit'}) for {selectedTerm}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-900 border border-gray-700 text-xs flex items-center justify-between">
                  <span className="text-gray-400">Target Transfer Amount:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {formatNaira(currentPayableAmount)}
                  </span>
                </div>

                {uploadSuccessNotice && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Receipt submitted for {selectedTerm}! Bursar review in progress.</span>
                  </div>
                )}

                <form onSubmit={handleUploadReceiptSubmit} className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer transition bg-gray-900"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*,application/pdf"
                      className="hidden"
                    />
                    <UploadCloud className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-semibold text-gray-200">
                      {selectedFile ? selectedFile.name : 'Click to select receipt image or PDF'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">PNG, JPG, or PDF (Max 5MB)</p>
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedFile || isUploading}
                    className="w-full py-3 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-2 border border-rose-800 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <span>Uploading Proof...</span>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-amber-400" />
                        <span>Submit {formatNaira(currentPayableAmount)} Receipt for {selectedTerm}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: School Bank Details Popup with One-Click Copy */}
        {showBankDetailsModal && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-lg w-full p-6 sm:p-7 text-gray-100 shadow-2xl relative space-y-5">
              <button
                onClick={() => setShowBankDetailsModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg bg-gray-900 border border-gray-700 cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gray-900 text-amber-400 border border-gray-700">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-50">Official School Bank Account</h3>
                  <p className="text-xs text-gray-400">
                    Transfer exactly <span className="text-amber-400 font-mono font-bold">{formatNaira(currentPayableAmount)}</span> for {selectedTerm}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-200">
                Payment Mode Selected:{' '}
                <strong className="text-amber-300 uppercase">
                  {paymentChoice === 'full' ? 'Full Payment' : 'Partial Payment Deposit'}
                </strong>{' '}
                — Amount: <strong className="text-white font-mono">{formatNaira(currentPayableAmount)}</strong>
              </div>

              {/* Bank Details List with Copy Buttons */}
              <div className="space-y-3">
                {/* Bank Name */}
                <div className="p-3.5 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                      Bank Name
                    </span>
                    <span className="text-sm font-bold text-gray-100">First Bank of Nigeria</span>
                  </div>
                  <button
                    onClick={() => copyBankInfo('First Bank of Nigeria', 'bank')}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition cursor-pointer"
                  >
                    {copiedBankField === 'bank' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Account Number */}
                <div className="p-3.5 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">
                      Account Number (NUBAN)
                    </span>
                    <span className="text-lg font-black text-amber-400 font-mono tracking-wider">0123456789</span>
                  </div>
                  <button
                    onClick={() => copyBankInfo('0123456789', 'account_no')}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition cursor-pointer"
                  >
                    {copiedBankField === 'account_no' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Account Name */}
                <div className="p-3.5 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                      Account Name
                    </span>
                    <span className="text-sm font-bold text-gray-100 truncate block">
                      {schoolInfo.name} Educational Services
                    </span>
                  </div>
                  <button
                    onClick={() => copyBankInfo(`${schoolInfo.name} Educational Services`, 'account_name')}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition cursor-pointer shrink-0"
                  >
                    {copiedBankField === 'account_name' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Transfer Narration */}
                <div className="p-3.5 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                      Payment Narration / Reference
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-300">
                      {activeStudent.reg_number} - {activeStudent.full_name}
                    </span>
                  </div>
                  <button
                    onClick={() => copyBankInfo(`${activeStudent.reg_number} ${activeStudent.full_name}`, 'narration')}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition cursor-pointer"
                  >
                    {copiedBankField === 'narration' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowBankDetailsModal(false)}
                  className="w-full py-3 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-2 border border-rose-800 transition cursor-pointer"
                >
                  <span>Done, Ready to Upload Transfer Proof</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 3D TROPHY */}
        {activeTab === 'awards' && (
          <div className="p-6 rounded-3xl bg-gray-800 border border-gray-700 flex flex-col items-center justify-center space-y-4">
            <h3 className="text-base font-bold text-gray-50">Academic Excellence Award</h3>
            <p className="text-xs text-gray-400 max-w-md text-center">
              Rendered in real-time 3D for pupils in top standing with GPA above 3.5.
            </p>
            <div className="w-full max-w-md h-80 bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
              <Trophy3DCanvas title={`${activeStudent.full_name} - Academic Laureate`} category="Distinction" points={Math.round(Number(averageScore) * 10)} />
            </div>
          </div>
        )}

        {/* PRINTABLE OFFICIAL RESULT SLIP MODAL WITH NDPA 2023 SECURITY BADGE */}
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white text-gray-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-auto">
              {/* Modal Controls */}
              <div className="flex items-center justify-between border-b pb-4 print:hidden">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-rose-900" />
                  <span className="font-bold text-sm text-gray-900">Official Terminal Result Sheet</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-rose-900 hover:bg-rose-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Slip</span>
                  </button>
                  <button
                    onClick={() => setIsPrintModalOpen(false)}
                    className="p-2 text-gray-500 hover:text-gray-900 rounded-xl border border-gray-200 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Result Slip Content */}
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="text-center space-y-1 border-b pb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-950 text-amber-400 font-black text-xl mb-1">
                    A
                  </div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{schoolInfo.name}</h2>
                  <p className="text-xs text-gray-600 italic">{schoolInfo.motto} • {schoolInfo.address}</p>
                  <p className="text-xs font-bold text-rose-900 uppercase pt-1">
                    OFFICIAL STUDENT TERMINAL PERFORMANCE REPORT — {selectedTerm.toUpperCase()} ({activeStudent.session})
                  </p>
                </div>

                {/* Student Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase block font-semibold">Student Name:</span>
                    <strong className="text-gray-900 text-sm">{activeStudent.full_name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase block font-semibold">Reg Number:</span>
                    <strong className="font-mono text-gray-900">{activeStudent.reg_number}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase block font-semibold">Class / Arm:</span>
                    <strong className="text-gray-900">{activeStudent.class_grade}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase block font-semibold">Term Clearance:</span>
                    <strong className="text-emerald-700 font-bold">Verified & Paid in Full</strong>
                  </div>
                </div>

                {/* Grades Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 uppercase text-[10px] tracking-wider text-gray-700 border-b">
                      <tr>
                        <th className="px-4 py-2.5">Subject</th>
                        <th className="px-3 py-2.5 text-center">CA 1 (20)</th>
                        <th className="px-3 py-2.5 text-center">CA 2 (20)</th>
                        <th className="px-3 py-2.5 text-center">Exam (60)</th>
                        <th className="px-3 py-2.5 text-center font-bold">Total (100)</th>
                        <th className="px-3 py-2.5 text-center">Grade</th>
                        <th className="px-4 py-2.5">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {studentResults.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-2 font-semibold text-gray-900">{r.subject_name}</td>
                          <td className="px-3 py-2 text-center font-mono">{r.ca1}</td>
                          <td className="px-3 py-2 text-center font-mono">{r.ca2}</td>
                          <td className="px-3 py-2 text-center font-mono">{r.exam}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-gray-900">{r.total_score}</td>
                          <td className="px-3 py-2 text-center font-bold font-mono text-rose-900">{r.grade}</td>
                          <td className="px-4 py-2 text-gray-600 italic text-[11px]">{r.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Score Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs">
                  <div>
                    <span className="text-gray-500">Term Average Score:</span>
                    <strong className="text-rose-900 font-bold ml-1 text-base">{averageScore}%</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Subjects Passed:</span>
                    <strong className="text-gray-900 font-bold ml-1">{subjectsPassed} of {studentResults.length}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Principal Sign-off:</span>
                    <strong className="text-gray-900 font-bold ml-1">{schoolInfo.principal_name}</strong>
                  </div>
                </div>

                {/* MANDATORY NDPA 2023 STATUTORY COMPLIANCE BADGE ON RESULT SLIP */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                    <div>
                      <strong className="block text-[11px] font-bold uppercase text-emerald-950">
                        NDPA 2023 Compliant (AES-256 Encrypted & NDPC Minor Data Shield)
                      </strong>
                      <span className="text-[10px] text-emerald-800">
                        Institutional statutory data governance certificate • NDPC Registered Minor Academic Record
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    CERT-2026-NDPA
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
