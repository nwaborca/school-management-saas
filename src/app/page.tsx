'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { AnimatedContent } from '@/components/AnimatedContent';
import {
  GraduationCap,
  KeyRound,
  FileText,
  DollarSign,
  Shield,
  ArrowRight,
  CheckCircle2,
  Users,
  Award,
  BookOpen,
  Check,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export default function HomePage() {
  const { schoolInfo } = useApp();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24 overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 border-b border-[#E2E8F0] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedContent
            distance={40}
            direction="vertical"
            duration={0.6}
            ease="power2.out"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Content */}
              <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Session {schoolInfo.academic_year} • Complete Institutional Platform</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0F172A] tracking-tight leading-[1.1]">
                  Complete School Operations, Grading & Fee Management.
                </h1>

                <p className="text-[#475569] text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  Built for Nigerian Nursery, Primary, and Secondary schools. Manage CA1/CA2/Exam broadsheets, generate WAEC/NECO-aligned report cards, and verify school fee payments in one unified portal.
                </p>

                {/* Call to Action */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                  <Link
                    href="/register-school"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    <span>Register Your School</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-300 flex items-center justify-center gap-2 transition"
                  >
                    <span>Sign In to Portal</span>
                  </Link>
                </div>

                {/* Key Verification Badges */}
                <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Reg No + PIN Access</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>33 Class Tiers (Creche – SS3)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>WAEC / NECO Graded</span>
                  </div>
                </div>
              </div>

              {/* Right Hero Visual: Framed High-Resolution Product Preview Mockup */}
              <div className="lg:col-span-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  {/* Browser-like Header */}
                  <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">portal.aegisschools.ng/academic-hub</span>
                    <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Live Cloud Sync
                    </div>
                  </div>

                  {/* Mock Product Dashboard UI */}
                  <div className="p-4 space-y-4 bg-slate-50/50 rounded-xl mt-3">
                    {/* Top Stats Strip */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <div className="text-[10px] font-medium text-slate-500">Grading Stream</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">SS1 Arm A (Science)</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <div className="text-[10px] font-medium text-slate-500">Subject Pass Rate</div>
                        <div className="text-sm font-bold text-emerald-700 mt-0.5">100% (≥50%)</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <div className="text-[10px] font-medium text-slate-500">Fee Clearance Gate</div>
                        <div className="text-sm font-bold text-[#1D4ED8] mt-0.5">Automated Lock</div>
                      </div>
                    </div>

                    {/* Broadsheet / Table Preview */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Chemistry Continuous Assessment Matrix</span>
                        <span className="text-[11px] text-slate-500">Session 2025/2026 • 1st Term</span>
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-600 font-semibold">
                            <th className="p-2.5">Student</th>
                            <th className="p-2.5">Reg Number</th>
                            <th className="p-2.5 text-center">CA1 (20)</th>
                            <th className="p-2.5 text-center">CA2 (20)</th>
                            <th className="p-2.5 text-center">Exam (60)</th>
                            <th className="p-2.5 text-center font-bold text-slate-900">Total</th>
                            <th className="p-2.5 text-center">Grade</th>
                            <th className="p-2.5 text-right">Fee Clearance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          <tr>
                            <td className="p-2.5 font-medium text-slate-900">Chidinma Okafor</td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-500">STU-2026-841</td>
                            <td className="p-2.5 text-center font-mono font-medium">18</td>
                            <td className="p-2.5 text-center font-mono font-medium">19</td>
                            <td className="p-2.5 text-center font-mono font-medium">52</td>
                            <td className="p-2.5 text-center font-mono font-bold text-slate-900">89</td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                A1
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Paid in Full
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-medium text-slate-900">Tunde Bakare</td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-500">STU-2026-103</td>
                            <td className="p-2.5 text-center font-mono font-medium">16</td>
                            <td className="p-2.5 text-center font-mono font-medium">17</td>
                            <td className="p-2.5 text-center font-mono font-medium">48</td>
                            <td className="p-2.5 text-center font-mono font-bold text-slate-900">81</td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                A1
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Unpaid
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* 2. THREE-COLUMN ENTERPRISE FEATURE GRID */}
      <section id="features" className="py-20 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#1D4ED8] uppercase tracking-wider">
              Core Capabilities
            </span>
            <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Designed for Nigerian School Administrators
            </h2>
            <p className="text-[#475569] text-base leading-relaxed">
              Every feature aligns with the statutory curriculum, continuous assessment breakdown, and financial clearance processes used by leading Nigerian schools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-[#1D4ED8]" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">Continuous Assessment & Broadsheets</h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Fast, spreadsheet-style grade entry for CA1 (20), CA2 (20), and Terminal Exam (60). Automatic WAEC/NECO grade mapping (A1 to F9) with real-time class ranking.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 text-xs font-semibold text-[#1D4ED8]">
                WAEC & NECO Aligned
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">Naira Bursary & Receipt Verification</h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Verify bank deposit slips with an interactive audit viewer. Record partial payments, track historical student debts, and enforce automatic result clearance locks.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 text-xs font-semibold text-emerald-700">
                Automated Clearance Gate
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-slate-700" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">Role-Based Access & PIN Security</h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Students and parents log in securely using their Registration Number and 4-digit PIN. Staff, principals, and bursars enjoy scoped, role-based administrative dashboards.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 text-xs font-semibold text-slate-700">
                Strict RBAC Protection
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CALL TO ACTION BANNER */}
      <section className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-2xl bg-[#0F172A] text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Ready to manage your school with complete clarity?
              </h3>
              <p className="text-slate-300 text-sm max-w-xl">
                Log in to access your school operations, verify fee payments, and generate official terminal results.
              </p>
            </div>
            <Link
              href="/login"
              className="px-6 py-3 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 transition shrink-0"
            >
              <span>Access School Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
