'use client';

import { AnimatedContent } from '@/components/AnimatedContent';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { TuitionInvoice, formatNaira } from '@/types';
import {
  DollarSign,
  CreditCard,
  CheckCircle2,
  Clock,
  Filter,
  Receipt,
  Building2,
} from 'lucide-react';

export default function FinancialEnginePage() {
  const { schoolInfo, invoices, payInvoiceStub } = useApp();
  const [selectedInvoice, setSelectedInvoice] = useState<TuitionInvoice | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'partial'>('all');

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === 'all') return true;
    return inv.status === statusFilter;
  });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const outstandingBalance = totalInvoiced - totalCollected;

  const handlePayStub = () => {
    if (!selectedInvoice) return;
    setIsProcessing(true);

    setTimeout(() => {
      payInvoiceStub(selectedInvoice.id);
      setIsProcessing(false);
      setSelectedInvoice((prev) => (prev ? { ...prev, status: 'paid', paid_amount: prev.total_amount } : null));
    }, 1000);
  };

  return (
    <div className="min-h-screen text-gray-100 p-4 sm:p-6 lg:p-8">
      <AnimatedContent distance={100} direction="vertical" duration={0.8} ease="power3.out" blur={0} stagger={0.08} threshold={0.1}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold uppercase tracking-wider mb-1">
              <span className="font-bold text-sm">₦</span>
              <span>Nigerian School Bursary & Treasury (NGN)</span>
            </div>
            <h1 className="text-3xl font-black text-gray-50 tracking-tight">Tuition & Fee Engine</h1>
            <p className="text-gray-400 text-sm mt-1">
              {schoolInfo.name} • Itemized Nigerian Naira (₦) fee schedules, collection metrics, and payment receipts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-gray-900 border border-gray-700 text-amber-400 text-xs font-semibold font-mono">
              Default Currency: Nigerian Naira (₦ / NGN)
            </span>
          </div>
        </div>

        {/* Metrics in Naira (₦) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-gray-800 border border-gray-700">
            <span className="text-xs text-gray-400 font-semibold uppercase">Total Term Invoiced</span>
            <div className="text-2xl font-black text-gray-50 font-mono mt-1">
              {formatNaira(totalInvoiced)}
            </div>
            <span className="text-[11px] text-gray-500">Session {schoolInfo.session} Term Assessment</span>
          </div>

          <div className="p-5 rounded-2xl bg-gray-800 border border-gray-700">
            <span className="text-xs text-gray-400 font-semibold uppercase">Collected Revenue (₦)</span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {formatNaira(totalCollected)}
            </div>
            <span className="text-[11px] text-emerald-400">
              {totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : 0}% settlement rate
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-gray-800 border border-gray-700">
            <span className="text-xs text-gray-400 font-semibold uppercase">Outstanding Receivables</span>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">
              {formatNaira(outstandingBalance)}
            </div>
            <span className="text-[11px] text-amber-400">Pending parent payments</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-4 flex-wrap bg-gray-900/90 p-4 rounded-xl border border-gray-700">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-300 font-semibold uppercase">Filter Status:</span>
            <div className="flex gap-1.5">
              {(['all', 'paid', 'pending', 'partial'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition cursor-pointer ${
                    statusFilter === st ? 'bg-rose-900 text-gray-50 border border-rose-800' : 'bg-gray-800 text-gray-300 hover:text-white border border-gray-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
          <span className="text-xs text-gray-400">{filteredInvoices.length} Invoices</span>
        </div>

        {/* Invoices Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-200">
              <thead className="bg-gray-900 text-xs uppercase text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Student & Reg No</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Total Amount (₦)</th>
                  <th className="px-6 py-4">Paid (₦)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 text-xs">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-750 transition">
                    <td className="px-6 py-4 font-mono font-bold text-amber-400">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-50">{inv.student_name}</div>
                      <div className="font-mono text-[10px] text-gray-400">{inv.reg_number} • {inv.class_grade}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-300">{inv.due_date}</td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-50">{formatNaira(inv.total_amount)}</td>
                    <td className="px-6 py-4 font-mono text-gray-400">{formatNaira(inv.paid_amount)}</td>
                    <td className="px-6 py-4">
                      {inv.status === 'paid' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Paid</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-400 border border-amber-800 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setIsPayModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-gray-50 text-xs font-semibold border border-rose-800 transition cursor-pointer"
                      >
                        Itemized Receipt (₦)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Itemized Invoice Modal */}
      {isPayModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-md w-full p-6 text-gray-100 shadow-2xl relative">
            <button
              onClick={() => setIsPayModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg bg-gray-900 border border-gray-700 cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-50">Itemized School Fees Slip</h3>
                <p className="text-xs text-gray-400 font-mono">{selectedInvoice.invoice_number}</p>
              </div>
            </div>

            <div className="p-3 bg-gray-900 rounded-xl mb-4 text-xs space-y-1 border border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-400">Student Name:</span>
                <span className="font-bold text-gray-50">{selectedInvoice.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reg No & Class:</span>
                <span className="font-mono text-amber-400">{selectedInvoice.reg_number} ({selectedInvoice.class_grade})</span>
              </div>
            </div>

            <div className="border border-gray-700 rounded-xl p-3 mb-4 space-y-2 text-xs bg-gray-900/60">
              {selectedInvoice.line_items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-1 border-b border-gray-700">
                  <span className="text-gray-300">{item.description}</span>
                  <span className="font-mono text-gray-100">{formatNaira(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-sm font-bold text-gray-50">
                <span>Total Fee Assessed:</span>
                <span className="font-mono text-emerald-400">{formatNaira(selectedInvoice.total_amount)}</span>
              </div>
            </div>

            {selectedInvoice.status === 'paid' ? (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-center text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Invoice Cleared in Full. Official receipt issued.</span>
              </div>
            ) : (
              <button
                onClick={handlePayStub}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-2 border border-rose-800 transition cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <span>Processing Interswitch / Paystack...</span> : <span>Simulate Paystack/Moniepoint Clearance</span>}
              </button>
            )}
          </div>
        </div>
      )}
          </AnimatedContent>
    </div>
  );
}
