'use client';

import { AnimatedContent } from '@/components/AnimatedContent';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Trophy3DCanvas } from '@/components/3d/Trophy3DCanvas';
import { formatNaira, StudentProfile } from '@/types';
import { filterSubjectsForClassAndStream } from '@/lib/streamSpecialization';
import { uploadReceiptToStorage } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
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
  UserCheck,
  QrCode,
  Share2,
  Trash2,
  KeyRound,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const router = useRouter();
  const {
    classes,
    subjects,
    currentUser,
    currentSchool,
    students,
    results,
    invoices,
    schoolInfo,
    feeStructures,
    receipts,
    transactions,
    pickupPasses = [],
    uploadReceipt,
    getStudentTermLedger,
    generateDailyParentPass,
    generateDelegatePass,
    revokePickupPass,
    resultsPublished,
    logout,
    isAuthReady,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'results' | 'fees' | 'pickup' | 'awards'>('results');
  const [selectedTerm, setSelectedTerm] = useState('1st Term');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Phase 4: Delegate Pass Generation Modal State
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [delegateNameInput, setDelegateNameInput] = useState('');
  const [isGeneratingPass, setIsGeneratingPass] = useState(false);
  const [passActionNotice, setPassActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedPassText, setCopiedPassText] = useState(false);

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
  // If students list is still loading from Supabase, construct initial profile from currentUser session
  const activeStudent: StudentProfile | null = useMemo(() => {
    if (currentUser?.role !== 'student') return null;
    const found = students.find((s) => s.id === currentUser?.student_id) ||
      students.find((s) => s.reg_number === currentUser?.reg_number);
    if (found) return found;

    if (currentUser.student_id || currentUser.reg_number) {
      return {
        id: currentUser.student_id || currentUser.id,
        reg_number: currentUser.reg_number || 'STU-PORTAL',
        access_pin: '****',
        full_name: currentUser.full_name || 'Student',
        class_id: currentUser.class_id || 'cls-ss1-a',
        class_grade: currentUser.class_grade || 'SS1 Arm A',
        session: schoolInfo.session || '2025/2026',
        parent_name: 'Parent / Guardian',
        parent_phone: currentUser.parent_phone || '+2348000000000',
        gpa: 3.5,
        attendance_percentage: 100.0,
        fee_paid: false,
        payment_status: 'unpaid',
        tuition_status: 'pending',
        created_at: new Date().toISOString(),
      };
    }
    return null;
  }, [currentUser, students, schoolInfo.session]);

  // RBAC Guard: If user is not authenticated, redirect to login
  useEffect(() => {
    if (!isAuthReady) return;
    if (!currentUser) {
      router.push('/login');
    } else if (currentUser.role !== 'student') {
      if (currentUser.role === 'teacher') {
        router.push('/academic-hub');
      } else if (currentUser.role === 'admin') {
        router.push('/admin-hub');
      }
    }
  }, [currentUser, isAuthReady, router]);

  const studentClass = activeStudent
    ? classes.find((c) => c.id === activeStudent.class_id) ||
      classes.find((c) => c.name === activeStudent.class_grade)
    : undefined;

  const allowedStreamSubjects = filterSubjectsForClassAndStream(subjects, studentClass);
  const allowedSubjectIds = new Set(allowedStreamSubjects.map((s) => s.id));

  const studentResults = activeStudent
    ? results.filter((r) => {
        if (r.student_id !== activeStudent.id || r.term !== selectedTerm) return false;
        if (studentClass?.stage === 'senior_secondary') {
          return allowedSubjectIds.has(r.subject_id);
        }
        return true;
      })
    : [];

  const totalScoreObtained = studentResults.reduce((sum, r) => sum + r.total_score, 0);
  const totalMaxScore = studentResults.length * 100;
  const averageScore =
    studentResults.length > 0 ? (totalScoreObtained / studentResults.length).toFixed(1) : '0.0';
  const subjectsPassed = studentResults.filter((r) => r.total_score >= 50).length;

  const classFeeStructure = activeStudent
    ? feeStructures.find(
        (fs) => fs.class_id === activeStudent.class_id && fs.term === selectedTerm && fs.published
      ) || feeStructures.find((fs) => fs.class_id === activeStudent.class_id && fs.published)
    : undefined;

  // Compute Term-Isolated Partial Payment & Ledger
  const termLedger = activeStudent
    ? getStudentTermLedger(activeStudent.id, selectedTerm)
    : {
        totalTermFee: 0,
        totalPaid: 0,
        remainingBalance: 0,
        paymentStatus: 'unpaid' as const,
        isUnlocked: false,
      };
  const isPaid = termLedger.isUnlocked;
  const isPendingVerification = termLedger.paymentStatus === 'pending_verification';
  const isPartiallyPaid = termLedger.paymentStatus === 'partially_paid';

  // Default partial amount to remaining balance if student returns to pay balance
  useEffect(() => {
    const targetVal = termLedger.remainingBalance > 0 ? String(termLedger.remainingBalance) : '';
    setCustomPartialAmount((prev) => (prev !== targetVal ? targetVal : prev));
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

    if (!activeStudent) {
      setIsUploading(false);
      return;
    }
    const studentId = activeStudent.id;
    const studentSession = activeStudent.session || schoolInfo.session || '2025/2026';

    try {
      const storageResult = await uploadReceiptToStorage(currentFile, studentId);

      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(currentFile);
      });

      const res = await uploadReceipt(studentId, {
        fileName: currentFile.name,
        fileDataUrl: storageResult?.url || fileDataUrl,
        fileType: currentFile.type || (currentFile.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        storagePath: storageResult?.path,
        amountClaimed: amountClaimed,
        paymentMode: paymentChoice,
        feeStructureId: classFeeStructure?.id,
        term: selectedTerm,
        session: studentSession,
      });

      if (!res.success) {
        alert(`Failed to save payment proof: ${res.error || 'Database submission error'}`);
      } else {
        setSelectedFile(null);
        setUploadSuccessNotice(true);
        setShowBankDetailsModal(false);
        setTimeout(() => setUploadSuccessNotice(false), 5000);
      }
    } catch (err: any) {
      console.error('Receipt upload failed:', err);
      alert('An error occurred while uploading payment receipt.');
    } finally {
      setIsUploading(false);
    }
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

  // Phase 4: Active Pickup Passes for the Logged Student
  const activeStudentPasses = useMemo(() => {
    if (!activeStudent) return [];
    return pickupPasses
      .filter((p) => p.student_id === activeStudent.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [pickupPasses, activeStudent]);

  // Today's active daily parent pass (if any)
  const todayDailyPass = useMemo(() => {
    return activeStudentPasses.find(
      (p) =>
        p.pass_type === 'DAILY_PARENT' &&
        p.status === 'ACTIVE' &&
        new Date(p.expires_at) > new Date()
    ) || null;
  }, [activeStudentPasses]);

  // Active delegate passes (status ACTIVE and not expired)
  const activeDelegatePasses = useMemo(() => {
    return activeStudentPasses.filter(
      (p) =>
        p.pass_type === 'DELEGATE_5H' &&
        p.status === 'ACTIVE' &&
        new Date(p.expires_at) > new Date()
    );
  }, [activeStudentPasses]);

  // Recent used or expired passes history
  const historicalPasses = useMemo(() => {
    return activeStudentPasses.filter(
      (p) => p.status === 'USED' || p.status === 'EXPIRED' || new Date(p.expires_at) <= new Date()
    ).slice(0, 5);
  }, [activeStudentPasses]);

  // Auto-generate or retrieve daily parent pass when viewing the tab
  const handleGenerateDailyPass = async () => {
    if (!activeStudent) return;
    setIsGeneratingPass(true);
    setPassActionNotice(null);
    try {
      const res = await generateDailyParentPass(activeStudent.id);
      if (res.success) {
        setPassActionNotice({ type: 'success', message: 'Today’s Parent Pick-Up Pass is active.' });
      } else {
        setPassActionNotice({ type: 'error', message: res.error || 'Failed generating parent pass.' });
      }
    } catch (e: any) {
      setPassActionNotice({ type: 'error', message: e?.message || 'Error creating pass.' });
    } finally {
      setIsGeneratingPass(false);
    }
  };

  const handleCreateDelegatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !delegateNameInput.trim()) return;
    setIsGeneratingPass(true);
    setPassActionNotice(null);
    try {
      const res = await generateDelegatePass(activeStudent.id, delegateNameInput.trim());
      if (res.success) {
        setIsDelegateModalOpen(false);
        setDelegateNameInput('');
        setPassActionNotice({ type: 'success', message: `5-Hour Delegate Pass generated for ${res.pass?.delegate_name}!` });
      } else {
        setPassActionNotice({ type: 'error', message: res.error || 'Failed generating delegate pass.' });
      }
    } catch (e: any) {
      setPassActionNotice({ type: 'error', message: e?.message || 'Error generating delegate pass.' });
    } finally {
      setIsGeneratingPass(false);
    }
  };

  const handleRevokePass = async (passId: string) => {
    if (!confirm('Are you sure you want to revoke this pick-up pass? Anyone presenting this code will be rejected at the gate.')) {
      return;
    }
    setPassActionNotice(null);
    try {
      const res = await revokePickupPass(passId);
      if (res.success) {
        setPassActionNotice({ type: 'success', message: 'Pick-Up Pass has been revoked immediately.' });
      } else {
        setPassActionNotice({ type: 'error', message: res.error || 'Failed revoking pass.' });
      }
    } catch (e: any) {
      setPassActionNotice({ type: 'error', message: 'Error revoking pass.' });
    }
  };

  const copyWhatsAppDetails = (pass: any) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const gateLink = `${origin}/pickup-pass/${pass.qr_token}`;
    const text = `*SAFE CHILD PICK-UP PASS* 🏫\nSchool: ${currentSchool?.name || schoolInfo.name}\nChild Name: ${activeStudent?.full_name}\nClass: ${activeStudent?.class_grade}\nAuthorized Collector: ${pass.delegate_name || 'Parent / Guardian'}\n6-Digit Gate Code: *${pass.otp_code}*\n\nOpen your mobile gate pass voucher:\n${gateLink}\n\n_Note: Single-use security token. Present this 6-digit code or QR code at the gate._`;

    navigator.clipboard.writeText(text);
    setCopiedPassText(true);
    setTimeout(() => setCopiedPassText(false), 3000);
  };

  if (!currentUser || !activeStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600  text-xs">
        <span>Authenticating session...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 pb-16">
      <AnimatedContent distance={100} direction="vertical" duration={0.8} ease="power3.out" blur={0} stagger={0.08} threshold={0.1}>
      {/* Top Student Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-600 border border-blue-600 flex items-center justify-center text-blue-600 font-black text-2xl shadow-sm">
              {activeStudent.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white text-blue-600 font-mono font-bold border border-slate-200">
                  {activeStudent.reg_number}
                </span>
                <span className="text-xs text-rose-300 font-semibold">{activeStudent.class_grade}</span>
                <span className="text-xs text-slate-600">•</span>
                <span className="text-xs text-slate-500 font-mono">Session: {activeStudent.session}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {activeStudent.full_name}
              </h1>
              <p className="text-xs text-slate-500">
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
                  ? 'bg-blue-600 hover:bg-blue-700 text-slate-900 border border-blue-600'
                  : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-200'
              }`}
            >
              {!resultsPublished ? (
                <Lock className="w-4 h-4 text-blue-600" />
              ) : isPaid ? (
                <Printer className="w-4 h-4 text-blue-600" />
              ) : (
                <Lock className="w-4 h-4 text-blue-600" />
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
              className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer border border-slate-200"
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
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
              Term Average
            </span>
            <div className="text-2xl sm:text-3xl font-black text-blue-600 font-mono mt-1">
              {averageScore}%
            </div>
            <span className="text-[10px] text-blue-600 font-medium">Distinction Standing</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
              Subjects Passed
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
              {subjectsPassed} / {studentResults.length}
            </div>
            <span className="text-[10px] text-slate-500">Official Pass Marks</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
              Cumulative Marks
            </span>
            <div className="text-2xl sm:text-3xl font-black text-rose-300 font-mono mt-1">
              {totalScoreObtained} <span className="text-xs text-slate-600 font-normal">/ {totalMaxScore}</span>
            </div>
            <span className="text-[10px] text-slate-500">{studentResults.length} Enrolled Subjects</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
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
                  <PieChart className="w-3 h-3 text-blue-600" />
                  <span>Partially Paid</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/60 text-rose-300 border border-blue-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Unpaid / Due</span>
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              {isPartiallyPaid
                ? `Bal Due: ${formatNaira(termLedger.remainingBalance)}`
                : 'Term Isolated Clearance'}
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('results')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'results'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Term Result Sheet
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'fees'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            School Fees & Bank Transfer Hub
          </button>
          <button
            onClick={() => setActiveTab('pickup')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pickup'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Safe Pick-Up & Dismissal Pass</span>
          </button>
          <button
            onClick={() => setActiveTab('awards')}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'awards'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            3D Academic Trophy
          </button>
        </div>

        {/* TAB 1: OFFICIAL RESULT SHEET */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            {!resultsPublished && (
              <div className="p-4 rounded-xl bg-amber-950/70 border border-amber-800 flex items-start gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
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
              <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-start gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-slate-900 font-bold block">
                    {isPendingVerification
                      ? 'Payment Receipt Uploaded — Pending Bursar Verification'
                      : 'School Fees Pending — Official Result Slip Download Locked'}
                  </strong>
                  <p className="text-slate-700">
                    {isPendingVerification
                      ? 'Your bank transfer proof has been submitted for this term and is awaiting Bursary review. Once verified, download and print capabilities will unlock immediately.'
                      : 'You may view your preliminary subject marks on screen, but generating the official institutional result slip requires fee clearance for this term. Proceed to the School Fees tab to upload your transfer receipt.'}
                  </p>
                </div>
              </div>
            )}

            {/* Term Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">Select Academic Term:</span>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="bg-slate-50 text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="1st Term">1st Term (September - December)</option>
                  <option value="2nd Term">2nd Term (January - April)</option>
                  <option value="3rd Term">3rd Term (May - July / Promotional)</option>
                </select>
              </div>

              <button
                onClick={handleDownloadResultSlip}
                className={`text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                  isPaid ? 'text-blue-600 hover:underline' : 'text-slate-600'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isPaid ? 'Print Terminal Slip' : 'Print Locked'}</span>
              </button>
            </div>

            {/* Grades Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {!resultsPublished ? (
                <div className="p-10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-blue-600">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Terminal Examination Results Not Yet Published</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Faculty grading for {selectedTerm} is undergoing institutional review. Once the Principal approves and publishes results, your score breakdown will appear here.
                  </p>
                </div>
              ) : !isPaid ? (
                <div className="p-10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-rose-950/60 border border-blue-600/80 flex items-center justify-center text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">School Fees Clearance Required to View Results</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Official term grades are published by the Principal, but institutional policy requires school fees clearance to unlock your results. Please proceed to the Tuition & Fees tab to upload your payment receipt or clear your outstanding balance.
                  </p>
                  <button
                    onClick={() => setActiveTab('fees')}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs transition cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Go to School Fees Hub</span>
                  </button>
                </div>
              ) : studentResults.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                  No examination marks recorded for {selectedTerm} yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5">Subject</th>
                        <th className="px-4 py-3.5 text-center">CA 1 (20)</th>
                        <th className="px-4 py-3.5 text-center">CA 2 (20)</th>
                        <th className="px-4 py-3.5 text-center">Exam (60)</th>
                        <th className="px-4 py-3.5 text-center font-bold text-slate-900">Total (100)</th>
                        <th className="px-4 py-3.5 text-center">Grade</th>
                        <th className="px-5 py-3.5">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {studentResults.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>{item.subject_name}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono text-slate-700">{item.ca1}</td>
                          <td className="px-4 py-3.5 text-center font-mono text-slate-700">{item.ca2}</td>
                          <td className="px-4 py-3.5 text-center font-mono text-slate-700">{item.exam}</td>
                          <td className="px-4 py-3.5 text-center font-mono font-black text-sm text-slate-900">{item.total_score}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md font-mono font-bold text-xs ${
                                item.grade === 'A'
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                                  : item.grade === 'B'
                                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800'
                                  : 'bg-slate-50 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {item.grade}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 italic text-xs">{item.remarks}</td>
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
            <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-blue-600">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>Term Ledger & Debt Tracking</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-50 text-blue-600 font-mono border border-slate-200">
                        {selectedTerm}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
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
                      <PieChart className="w-4 h-4 text-blue-600" />
                      <span>{selectedTerm}: Partially Paid</span>
                    </span>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-950/60 text-rose-300 border border-blue-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{selectedTerm}: Unpaid / Due</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Clear Ledger 3-Metric Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                    1. Total Term Fee
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                    {formatNaira(termLedger.totalTermFee)}
                  </div>
                  <span className="text-[10px] text-slate-600">Official Class Tariff</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
                    2. Total Amount Paid to Date
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                    {formatNaira(termLedger.totalPaid)}
                  </div>
                  <span className="text-[10px] text-emerald-500/80">Confirmed Credited Deposits</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider block">
                    3. Remaining Balance Due
                  </span>
                  <div className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
                    termLedger.remainingBalance === 0 ? 'text-emerald-400' : 'text-blue-600'
                  }`}>
                    {formatNaira(termLedger.remainingBalance)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {termLedger.remainingBalance === 0 ? 'Zero Debt (Results Unlocked)' : 'Result Slip Locked Until ₦0'}
                  </span>
                </div>
              </div>

              {/* Result Slip Lock Warning Banner for Partial or Unpaid */}
              {!isPaid && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-center gap-3">
                  <Lock className="w-5 h-5 text-blue-600 shrink-0" />
                  <p>
                    <strong>Institutional Clearance Policy:</strong> Official Terminal Result Slip download remains{' '}
                    <strong className="text-rose-300">LOCKED</strong> until the remaining balance reaches{' '}
                    <strong className="text-emerald-300 font-mono">₦0.00</strong> (Full Payment).
                  </p>
                </div>
              )}
            </div>

            {/* Payment Choice Selection Engine */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Choose Payment Mode for {selectedTerm}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select whether to pay the full term balance at once or deposit a custom partial amount.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Full Payment Card */}
                <div
                  onClick={() => handleSelectPaymentChoice('full')}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                    paymentChoice === 'full'
                      ? 'bg-rose-950/40 border-amber-500 shadow-md'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${paymentChoice === 'full' ? 'text-blue-600' : 'text-slate-600'}`} />
                      <span>Full Payment</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-semibold">
                      Instant Result Unlock
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Pay the entire balance due of{' '}
                    <span className="text-blue-600 font-mono font-bold">
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
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-slate-900 text-xs font-bold border border-blue-600 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>View Bank Details for Full Payment</span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                </div>

                {/* Partial Payment Card */}
                <div
                  onClick={() => handleSelectPaymentChoice('partial')}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                    paymentChoice === 'partial'
                      ? 'bg-rose-950/40 border-amber-500 shadow-md'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <PieChart className={`w-4 h-4 ${paymentChoice === 'partial' ? 'text-blue-600' : 'text-slate-600'}`} />
                      <span>Partial Payment (Installment Deposit)</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 font-semibold">
                      Custom Naira Amount
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Input a custom amount you intend to transfer today. Your student debt ledger will be credited accordingly.
                  </p>

                  <form onSubmit={handleProceedPartialPayment} className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs font-mono font-bold">₦</span>
                      <input
                        type="number"
                        placeholder={
                          termLedger.remainingBalance > 0
                            ? `Default: ${termLedger.remainingBalance}`
                            : 'Enter amount in NGN (₦)'
                        }
                        value={customPartialAmount}
                        onChange={(e) => setCustomPartialAmount(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
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
              <div className="lg:col-span-7 p-6 rounded-xl bg-white border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Itemized Term Fee Schedule</h3>
                    <p className="text-xs text-slate-500">
                      {activeStudent.class_grade} ({selectedTerm})
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
                    {schoolInfo.session}
                  </span>
                </div>

                {classFeeStructure ? (
                  <div className="space-y-2 text-xs">
                    {classFeeStructure.line_items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2.5 border-b border-slate-200">
                        <span className="text-slate-700 font-medium">{item.description}</span>
                        <span className="font-mono text-slate-900 font-semibold">{formatNaira(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 text-base font-bold text-slate-900">
                      <span>Total Amount Due:</span>
                      <span className="font-mono text-xl font-black text-blue-600">
                        {formatNaira(classFeeStructure.total_amount)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No fee structure published for {activeStudent.class_grade} yet.
                  </div>
                )}
              </div>

              {/* Upload section */}
              <div className="lg:col-span-5 p-6 rounded-xl bg-white border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <UploadCloud className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Upload Payment Receipt</h3>
                    <p className="text-[11px] text-slate-500">
                      Proof of bank transfer ({paymentChoice === 'full' ? 'Full Payment' : 'Partial Deposit'}) for {selectedTerm}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-500">Target Transfer Amount:</span>
                  <span className="font-mono font-bold text-blue-600 text-sm">
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
                    className="border-2 border-dashed border-slate-200 hover:border-amber-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*,application/pdf"
                      className="hidden"
                    />
                    <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-semibold text-slate-800">
                      {selectedFile ? selectedFile.name : 'Click to select receipt image or PDF'}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1">PNG, JPG, or PDF (Max 5MB)</p>
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedFile || isUploading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 border border-blue-600 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <span>Uploading Proof...</span>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-blue-600" />
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
            <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 sm:p-7 text-slate-900 shadow-2xl relative space-y-5">
              <button
                onClick={() => setShowBankDetailsModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 rounded-lg bg-slate-100 border border-slate-200 cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-50 text-blue-600 border border-slate-200">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Official School Bank Account</h3>
                  <p className="text-xs text-slate-500">
                    Transfer exactly <span className="text-blue-600 font-mono font-bold">{formatNaira(currentPayableAmount)}</span> for {selectedTerm}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/40 border border-blue-600 text-xs text-rose-200">
                Payment Mode Selected:{' '}
                <strong className="text-amber-300 uppercase">
                  {paymentChoice === 'full' ? 'Full Payment' : 'Partial Payment Deposit'}
                </strong>{' '}
                — Amount: <strong className="text-slate-900 font-mono">{formatNaira(currentPayableAmount)}</strong>
              </div>

              {/* Bank Details List with Copy Buttons */}
              <div className="space-y-3">
                {/* Bank Name */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                      Bank Name
                    </span>
                    <span className="text-sm font-bold text-slate-900">First Bank of Nigeria</span>
                  </div>
                  <button
                    onClick={() => copyBankInfo('First Bank of Nigeria', 'bank')}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
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
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider block">
                      Account Number (NUBAN)
                    </span>
                    <span className="text-lg font-black text-blue-600 font-mono tracking-wider">0123456789</span>
                  </div>
                  <button
                    onClick={() => copyBankInfo('0123456789', 'account_no')}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
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
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                      Account Name
                    </span>
                    <span className="text-sm font-bold text-slate-900 truncate block">
                      {schoolInfo.name} Educational Services
                    </span>
                  </div>
                  <button
                    onClick={() => copyBankInfo(`${schoolInfo.name} Educational Services`, 'account_name')}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition cursor-pointer shrink-0"
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
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                      Payment Narration / Reference
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {activeStudent.reg_number} - {activeStudent.full_name}
                    </span>
                  </div>
                  <button
                    onClick={() => copyBankInfo(`${activeStudent.reg_number} ${activeStudent.full_name}`, 'narration')}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
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
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 border border-blue-600 transition cursor-pointer"
                >
                  <span>Done, Ready to Upload Transfer Proof</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SAFE PICK-UP & DISMISSAL PASS (PHASE 4) */}
        {activeTab === 'pickup' && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Jumia-Style Safe Dismissal Verification</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Child Safe Pick-Up & Gate Passes
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Protecting {activeStudent.full_name} ({activeStudent.class_grade}). School security verifies the 6-digit OTP or scannable QR token before student handover.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDelegateModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Generate Delegate Pass (5 Hours)</span>
                </button>
              </div>
            </div>

            {passActionNotice && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
                  passActionNotice.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {passActionNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{passActionNotice.message}</span>
                </div>
                <button
                  onClick={() => setPassActionNotice(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Passes Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Today's Daily Parent Pick-Up Pass */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Today&apos;s Parent Pick-Up Pass</h3>
                      <p className="text-[11px] text-slate-500">Valid until 11:59 PM today for registered parent/guardian</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Daily Active
                  </span>
                </div>

                {!todayDailyPass ? (
                  <div className="p-6 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                    <QrCode className="w-10 h-10 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-600 font-medium">No parent pass active for today yet.</p>
                    <button
                      type="button"
                      onClick={handleGenerateDailyPass}
                      disabled={isGeneratingPass}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingPass ? 'Generating...' : 'Activate Today’s Parent Pass'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Big OTP Display */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                        Parent Handover 6-Digit Code
                      </span>
                      <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-[#0F172A] py-1">
                        {todayDailyPass.otp_code}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Expires at 23:59:59 tonight • Single use
                      </span>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                      <QRCodeSVG
                        value={`AEGIS_PICKUP:${todayDailyPass.school_id}:${todayDailyPass.otp_code}`}
                        size={140}
                        level="H"
                        includeMargin={false}
                      />
                      <span className="text-[10px] font-mono text-slate-400">
                        Scan at gate or quote 6-digit code
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyWhatsAppDetails(todayDailyPass)}
                        className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-200"
                      >
                        <Share2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>{copiedPassText ? 'Copied Details!' : 'Copy for WhatsApp'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Active 5-Hour Delegate Passes */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">5-Hour Delegate Passes</h3>
                      <p className="text-[11px] text-slate-500">For drivers, relatives, or emergency collectors</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {activeDelegatePasses.length} Active
                  </span>
                </div>

                {activeDelegatePasses.length === 0 ? (
                  <div className="p-8 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                    <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-medium text-slate-600">No active delegate passes.</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Sending a driver or family member to pick up {activeStudent.full_name}? Generate a secure 5-hour pass for them.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsDelegateModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                    >
                      Create Delegate Pass
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeDelegatePasses.map((pass) => {
                      const diffMs = new Date(pass.expires_at).getTime() - Date.now();
                      const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
                      const minutes = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));

                      return (
                        <div key={pass.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                                Delegate Collector
                              </span>
                              <h4 className="text-sm font-black text-slate-900">{pass.delegate_name}</h4>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Expires in {hours}h {minutes}m
                            </span>
                          </div>

                          <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-lg border border-slate-200">
                            <div>
                              <span className="text-[9px] text-slate-500 uppercase font-semibold block">6-Digit Code</span>
                              <span className="text-xl font-mono font-black text-slate-900 tracking-wider">
                                {pass.otp_code}
                              </span>
                            </div>
                            <div className="p-1 bg-white border border-slate-100 rounded">
                              <QRCodeSVG
                                value={`AEGIS_PICKUP:${pass.school_id}:${pass.otp_code}`}
                                size={56}
                                level="M"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => copyWhatsAppDetails(pass)}
                              className="flex-1 py-1.5 px-3 rounded-md bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Copy for WhatsApp</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokePass(pass.id)}
                              className="py-1.5 px-3 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-rose-200"
                              title="Revoke pass immediately"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Revoke</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Pick-Up Handover History */}
            {historicalPasses.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recent Pick-Up & Dismissal Activity
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2">Pass Type</th>
                        <th className="px-3.5 py-2">Collector / Delegate</th>
                        <th className="px-3.5 py-2">Code</th>
                        <th className="px-3.5 py-2">Handover / Expiry Time</th>
                        <th className="px-3.5 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historicalPasses.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-3.5 py-2.5 font-medium text-slate-800">
                            {p.pass_type === 'DAILY_PARENT' ? 'Daily Parent' : '5-Hour Delegate'}
                          </td>
                          <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                            {p.delegate_name || 'Parent / Guardian'}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-600">{p.otp_code}</td>
                          <td className="px-3.5 py-2.5 text-slate-500">
                            {p.picked_up_at
                              ? `Handed over at ${new Date(p.picked_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : `Expired at ${new Date(p.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </td>
                          <td className="px-3.5 py-2.5">
                            {p.status === 'USED' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Completed Handover
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Expired / Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: 3D TROPHY */}
        {activeTab === 'awards' && (
          <div className="p-6 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center space-y-4">
            <h3 className="text-base font-bold text-slate-900">Academic Excellence Award</h3>
            <p className="text-xs text-slate-500 max-w-md text-center">
              Rendered in real-time 3D for pupils in top standing with GPA above 3.5.
            </p>
            <div className="w-full max-w-md h-80 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <Trophy3DCanvas title={`${activeStudent.full_name} - Academic Laureate`} category="Distinction" points={Math.round(Number(averageScore) * 10)} />
            </div>
          </div>
        )}

        {/* PRINTABLE OFFICIAL RESULT SLIP MODAL WITH NDPA 2023 SECURITY BADGE */}
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white text-gray-900 rounded-xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-auto">
              {/* Modal Controls */}
              <div className="flex items-center justify-between border-b pb-4 print:hidden">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-rose-900" />
                  <span className="font-bold text-sm text-gray-900">Official Terminal Result Sheet</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Slip</span>
                  </button>
                  <button
                    onClick={() => setIsPrintModalOpen(false)}
                    className="p-2 text-slate-600 hover:text-gray-900 rounded-xl border border-gray-200 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Result Slip Content */}
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="text-center space-y-1 border-b pb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-950 text-blue-600 font-black text-xl mb-1">
                    A
                  </div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{schoolInfo.name}</h2>
                  <p className="text-xs text-gray-600 italic">{schoolInfo.motto} • {schoolInfo.address}</p>
                  <p className="text-xs font-bold text-rose-900 uppercase pt-1">
                    OFFICIAL STUDENT TERMINAL PERFORMANCE REPORT — {selectedTerm.toUpperCase()} ({activeStudent.session})
                  </p>
                </div>

                {/* Student Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase block font-semibold">Student Name:</span>
                    <strong className="text-gray-900 text-sm">{activeStudent.full_name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase block font-semibold">Reg Number:</span>
                    <strong className="font-mono text-gray-900">{activeStudent.reg_number}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase block font-semibold">Class / Arm:</span>
                    <strong className="text-gray-900">{activeStudent.class_grade}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase block font-semibold">Term Clearance:</span>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                  <div>
                    <span className="text-slate-600">Term Average Score:</span>
                    <strong className="text-rose-900 font-bold ml-1 text-base">{averageScore}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Subjects Passed:</span>
                    <strong className="text-gray-900 font-bold ml-1">{subjectsPassed} of {studentResults.length}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Principal Sign-off:</span>
                    <strong className="text-gray-900 font-bold ml-1">{schoolInfo.principal_name}</strong>
                  </div>
                </div>

                {/* MANDATORY NDPA 2023 STATUTORY COMPLIANCE BADGE ON RESULT SLIP */}
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs text-emerald-900">
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
        {/* Delegate Pass Creation Modal */}
        {isDelegateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Generate 5-Hour Delegate Pass</h3>
                </div>
                <button
                  onClick={() => setIsDelegateModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateDelegatePass} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Delegate Full Name (Driver / Relative) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chukwuma Emmanuel Okafor or Driver Musa"
                    value={delegateNameInput}
                    onChange={(e) => setDelegateNameInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Security will ask for this name at the school gate before releasing {activeStudent.full_name}.
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Strict 5-Hour Expiry Window</span>
                  </div>
                  <p>
                    Pass expires in exactly 5 hours from generation. You can revoke it anytime with one tap.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDelegateModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingPass}
                    className="px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingPass ? 'Generating Token...' : 'Create & Share Pass'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
          </AnimatedContent>
    </div>
  );
}
