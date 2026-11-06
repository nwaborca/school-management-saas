'use client';

import { AnimatedContent } from '@/components/AnimatedContent';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { FeeLineItem, formatNaira } from '@/types';
import {
  ArrowLeft,
  Plus,
  Trash2,
  DollarSign,
  CheckCircle2,
  Clock,
  Send,
  Receipt,
  Eye,
  X,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Building2,
  FileCheck,
  ChevronDown,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Download,
  Lock,
} from 'lucide-react';

export default function AdminFeesPage() {
  const router = useRouter();
  const {
    currentUser,
    currentRole,
    classes,
    students,
    feeStructures,
    receipts,
    transactions,
    publishFeeStructure,
    deleteFeeStructure,
    approveReceipt,
    confirmPartialPayment,
    rejectReceipt,
    getStudentTermLedger,
    schoolInfo,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'builder' | 'receipts' | 'ledger'>('receipts');

  // Fee Builder State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1st Term');
  const [lineItems, setLineItems] = useState<Omit<FeeLineItem, 'id'>[]>([
    { description: 'Tuition & Academic Fee', amount: 0 },
  ]);
  const [publishSuccess, setPublishSuccess] = useState('');

  // Receipt Viewer State
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rejectNote, setRejectNote] = useState('');

  // Full Payment Confirmation Modal State
  const [confirmFullModalReceipt, setConfirmFullModalReceipt] = useState<{
    id: string;
    studentName: string;
    term: string;
    amount: number;
    regNumber: string;
  } | null>(null);

  // Partial Payment Modal State: 'Amount Claimed', 'Previous Debt', and 'New Remaining Balance'
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

  // Rejection Modal State
  const [rejectModalReceipt, setRejectModalReceipt] = useState<{
    id: string;
    studentName: string;
    regNumber: string;
    term: string;
  } | null>(null);
  const [customRejectNote, setCustomRejectNote] = useState('');

  // Ledger Filter State
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTermFilter, setLedgerTermFilter] = useState('all');

  // Guard: admin only
  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    } else if (currentRole !== 'admin') {
      router.push('/login');
    }
  }, [currentUser, currentRole, router]);

  if (!currentUser || currentRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400 text-xs">Authenticating administrator privileges...</p>
      </div>
    );
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const totalAmount = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  const existingStructure = feeStructures.find(
    (f) => f.class_id === selectedClassId && f.term === selectedTerm
  );

  const loadExistingStructure = () => {
    if (existingStructure) {
      setLineItems(existingStructure.line_items.map(({ description, amount }) => ({ description, amount })));
    }
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { description: '', amount: 0 }]);
  };

  const removeLineItem = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLineItem = (idx: number, field: 'description' | 'amount', value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, [field]: field === 'amount' ? Number(value) : value } : item
      )
    );
  };

  const handlePublish = () => {
    if (!selectedClassId || lineItems.length === 0) return;
    const validItems = lineItems.filter((i) => i.description.trim() && i.amount > 0);
    if (validItems.length === 0) return;

    publishFeeStructure({
      class_id: selectedClassId,
      class_name: selectedClass?.name || selectedClassId,
      term: selectedTerm,
      session: schoolInfo.session,
      line_items: validItems.map((item, idx) => ({
        ...item,
        id: `li-new-${idx}-${Date.now()}`,
      })),
      total_amount: validItems.reduce((s, i) => s + i.amount, 0),
      created_by: currentUser?.username || 'admin',
    });
    setPublishSuccess(`Fee structure for ${selectedClass?.name} (${selectedTerm}) published successfully!`);
    setTimeout(() => setPublishSuccess(''), 4000);
  };

  const activeReceipt = receipts.find((r) => r.id === viewingReceipt);
  const activeReceiptStudent = activeReceipt
    ? students.find((s) => s.id === activeReceipt.student_id)
    : null;

  const pendingReceipts = receipts.filter((r) => r.status === 'pending_verification');
  const processedReceipts = receipts.filter((r) => r.status !== 'pending_verification');

  return (
    <div className="min-h-screen text-gray-100 pb-16">
      <AnimatedContent distance={100} direction="vertical" duration={0.8} ease="power3.out" blur={0} stagger={0.08} threshold={0.1}>
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-5 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition cursor-pointer border border-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-50 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                School Fees & Bursary Hub
              </h1>
              <p className="text-xs text-gray-400">Build fee structures in Naira (₦) & verify bank transfer receipts</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-amber-400 text-xs font-bold">
              {pendingReceipts.length} Pending Verification
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Tab switch */}
        <div className="flex rounded-xl bg-gray-800 p-1 border border-gray-700 w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'receipts'
                ? 'bg-rose-900 text-amber-300 border border-rose-800'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-amber-400" />
            <span>Receipt Verification Queue ({pendingReceipts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'bg-rose-900 text-amber-300 border border-rose-800'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>Bursar Debt & Payment Ledger</span>
          </button>
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'builder'
                ? 'bg-rose-900 text-amber-300 border border-rose-800'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>Fee Structure Builder</span>
          </button>
        </div>

        {/* TAB 1: BUILDER */}
        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 p-6 rounded-3xl bg-gray-800 border border-gray-700 space-y-5">
              <div>
                <h2 className="text-base font-bold text-gray-50">Create / Update Class Fee Schedule</h2>
                <p className="text-xs text-gray-400">Configure itemized breakdowns for tuition, textbooks, uniforms, PTA levy, etc.</p>
              </div>

              {/* Class & Term Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">Target Class Arm:</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">-- Choose Class Arm --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">Academic Term:</label>
                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="1st Term">1st Term</option>
                    <option value="2nd Term">2nd Term</option>
                    <option value="3rd Term">3rd Term</option>
                  </select>
                </div>
              </div>

              {/* Line items editor */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Fee Category Breakdown</span>
                  <button
                    onClick={addLineItem}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Category
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Tuition Fee, Uniform, PTA Levy"
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-500"
                      />
                      <div className="relative w-36">
                        <span className="absolute left-3 top-2 text-gray-400 text-xs font-mono">₦</span>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={item.amount || ''}
                          onChange={(e) => updateLineItem(idx, 'amount', e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-7 pr-3 py-2 text-xs text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-500"
                        />
                      </div>
                      {lineItems.length > 1 && (
                        <button
                          onClick={() => removeLineItem(idx)}
                          className="p-2 text-gray-400 hover:text-rose-400 transition cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Live Running Total */}
                <div className="p-4 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-xs text-gray-400 font-semibold block">Total Term Fee (₦)</span>
                    <span className="text-xl font-black text-amber-400 font-mono">{formatNaira(totalAmount)}</span>
                  </div>
                  <button
                    onClick={handlePublish}
                    disabled={!selectedClassId || totalAmount === 0}
                    className="px-5 py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center gap-2 border border-rose-800 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>Publish Fee Structure</span>
                  </button>
                </div>

                {publishSuccess && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{publishSuccess}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Existing published schedules */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-gray-800 border border-gray-700 space-y-4">
              <h3 className="text-sm font-bold text-gray-50">Published Class Fee Structures ({feeStructures.length})</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {feeStructures.map((fs) => (
                  <div key={fs.id} className="p-3.5 rounded-2xl bg-gray-900 border border-gray-700 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-100">{fs.class_name}</span>
                      <span className="font-mono text-amber-400 font-bold">{fs.term}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 flex justify-between items-center pt-1 border-t border-gray-800">
                      <span>{fs.line_items.length} line items</span>
                      <span className="font-mono font-bold text-gray-200">{formatNaira(fs.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RECEIPT QUEUE */}
        {activeTab === 'receipts' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-gray-800 border border-gray-700 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gray-900 text-amber-400 border border-gray-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-50">Pending Receipt Verification Queue</h3>
                  <p className="text-xs text-gray-400">
                    Review uploaded transfer proofs. Choose to confirm full fee clearance, mark partial payment deposit, or reject.
                  </p>
                </div>
              </div>

              {pendingReceipts.length === 0 ? (
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
                        <th className="px-4 py-3">Uploaded</th>
                        <th className="px-4 py-3">Receipt</th>
                        <th className="px-4 py-3 text-center">3-Way Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {pendingReceipts.map((r) => {
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
                            <td className="px-4 py-3 text-gray-400 font-mono text-[10px]">
                              {new Date(r.uploaded_at).toLocaleDateString('en-NG')}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setViewingReceipt(r.id)}
                                className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {/* Green Button: Confirm Full Payment */}
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
                                  title="Marks term as Paid in Full, sets balance to ₦0, and unlocks result slip"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                                  <span>Confirm Full Payment</span>
                                </button>

                                {/* Amber/Gold Button: Mark Partial Payment */}
                                <button
                                  onClick={() => {
                                    const claimed = r.amount_claimed;
                                    const newBal = Math.max(0, previousDebt - claimed);
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
                                      newRemainingBalance: newBal,
                                    });
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-gray-950 font-black text-[10px] flex items-center gap-1 cursor-pointer transition shadow-sm"
                                  title="Pops up confirmation showing Amount Claimed, Previous Debt, and New Balance. Leaves result slip locked."
                                >
                                  <Clock className="w-3 h-3 text-gray-950" />
                                  <span>Mark Partial Payment</span>
                                </button>

                                {/* Red Button: Reject */}
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
                                  title="Rejects receipt and returns it to student for re-upload"
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

        {/* TAB 3: BURSAR DEBT & PAYMENT LEDGER ROSTER */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-gray-800 border border-gray-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gray-900 text-amber-400 border border-gray-700">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-50">Historical Payment Breakdown & Debt Ledger</h3>
                    <p className="text-xs text-gray-400">
                      Tracking transaction dates, amounts credited, and remaining student debts.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="text"
                    placeholder="Search student, reg number..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-500 w-48"
                  />
                  <select
                    value={ledgerTermFilter}
                    onChange={(e) => setLedgerTermFilter(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="all">All Academic Terms</option>
                    <option value="1st Term">1st Term</option>
                    <option value="2nd Term">2nd Term</option>
                    <option value="3rd Term">3rd Term</option>
                  </select>
                </div>
              </div>

              {/* Transactions History Table */}
              <div className="overflow-x-auto rounded-2xl border border-gray-700 bg-gray-900">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950 text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-3">Transaction Date</th>
                      <th className="px-4 py-3">Student Name & Reg No</th>
                      <th className="px-4 py-3">Class & Term</th>
                      <th className="px-4 py-3">Payment Type</th>
                      <th className="px-4 py-3 text-right">Amount Credited</th>
                      <th className="px-4 py-3 text-right">Remaining Debt</th>
                      <th className="px-4 py-3">Verified By / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {transactions
                      .filter((tx) => {
                        const matchesTerm = ledgerTermFilter === 'all' || tx.term === ledgerTermFilter;
                        const matchesSearch =
                          tx.student_name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                          tx.reg_number.toLowerCase().includes(ledgerSearch.toLowerCase());
                        return matchesTerm && matchesSearch;
                      })
                      .map((tx) => (
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
                          No payment transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Receipt Preview Modal */}
      {viewingReceipt && activeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-4xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-700 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-gray-50">Payment Receipt Review</h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeReceipt.student_name} ({activeReceipt.reg_number}) • {activeReceipt.class_grade} ({activeReceipt.term || '1st Term'})
                </p>
              </div>

              <button
                onClick={() => setViewingReceipt(null)}
                className="p-2 rounded-xl bg-gray-900 text-gray-400 hover:text-white border border-gray-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-y-auto">
              <div className="lg:col-span-7 flex flex-col bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden min-h-[340px] items-center justify-center p-4">
                {activeReceipt.file_data_url.startsWith('data:image') || /\.(png|jpe?g|webp|gif|svg)$/i.test(activeReceipt.file_name) ? (
                  <img
                    src={activeReceipt.file_data_url}
                    alt="Receipt"
                    className="max-w-full max-h-[440px] object-contain rounded-lg shadow-sm"
                  />
                ) : (
                  <div className="text-center p-8 text-gray-400 space-y-3">
                    <FileText className="w-14 h-14 mx-auto opacity-50 text-amber-500" />
                    <p className="text-sm font-bold text-gray-100">{activeReceipt.file_name}</p>
                    <p className="text-xs text-gray-400">PDF Document Proof of Payment</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                <div className="p-4 rounded-2xl bg-gray-900 border border-gray-700 space-y-3 text-xs">
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-semibold">Amount Claimed:</span>
                    <p className="text-xl font-black text-amber-400 font-mono mt-0.5">{formatNaira(activeReceipt.amount_claimed)}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-800">
                    <span className="text-gray-400 text-[10px] uppercase font-semibold">Student & Arm:</span>
                    <p className="font-bold text-gray-200 mt-0.5">{activeReceipt.student_name} ({activeReceipt.class_grade})</p>
                  </div>
                </div>

                {activeReceipt.status === 'pending_verification' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setConfirmFullModalReceipt({
                          id: activeReceipt.id,
                          studentName: activeReceipt.student_name,
                          term: activeReceipt.term || '1st Term',
                          amount: activeReceipt.amount_claimed,
                          regNumber: activeReceipt.reg_number,
                        });
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-emerald-100 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-700 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Confirm Full Payment (₦0 Debt & Unlock Result)</span>
                    </button>

                    <button
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
                      onClick={() => {
                        setRejectModalReceipt({
                          id: activeReceipt.id,
                          studentName: activeReceipt.student_name,
                          regNumber: activeReceipt.reg_number,
                          term: activeReceipt.term || '1st Term',
                        });
                        setCustomRejectNote('Invalid transfer receipt or mismatched credit. Please re-upload.');
                      }}
                      className="w-full py-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 border border-rose-800 transition cursor-pointer"
                    >
                      <X className="w-4 h-4 text-rose-400" />
                      <span>Reject Receipt</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
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
                  setViewingReceipt(null);
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

      {/* MODAL 2: Mark Partial Payment Modal ('Amount Claimed', 'Previous Debt', and 'New Remaining Balance') */}
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

            {/* 3 Explicit Highlight Cards: Amount Claimed, Previous Debt, New Remaining Balance */}
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
                  setViewingReceipt(null);
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
                  setViewingReceipt(null);
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
          </AnimatedContent>
    </div>
  );
}
