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
  ShieldCheck,
  QrCode,
  MapPin,
  Sparkles,
  Baby,
  Clock,
  Smartphone,
  CheckCheck,
} from 'lucide-react';

export default function HomePage() {
  const { schoolInfo, currentSchool } = useApp();

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
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Aegis Multi-Tenant Cloud • Session {schoolInfo.academic_year}</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0F172A] tracking-tight leading-[1.1]">
                  The Operating System for Modern Nigerian Schools.
                </h1>

                <p className="text-[#475569] text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  From 5-hour expiring delegate gate passes and geofenced teacher clock-ins to Early Years developmental commentary and WAEC broadsheets—Aegis automates school operations in one unified portal.
                </p>

                {/* Call to Action */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                  <Link
                    href="/register-school"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    <span>Register Your School Free</span>
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
                <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>60-Sec Self-Service Onboarding</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>33 Class Tiers (Creche – SS3)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Zero Hardware Geofenced QR</span>
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
                    <span className="text-[11px] font-mono text-slate-500">portal.aegisschools.ng/dashboard</span>
                    <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Verified Multi-Tenant</span>
                    </div>
                  </div>

                  {/* Mock Product Dashboard UI */}
                  <div className="p-4 space-y-4 bg-slate-50/50 rounded-xl mt-3">
                    {/* Top Operational Strip */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Child Gate Pass</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 mt-1 font-mono">OTP: 582-901</div>
                        <div className="text-[9px] text-emerald-600 font-semibold">Active • 5h Delegate</div>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#1D4ED8]" />
                          <span>Staff Geofence</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 mt-1">150m Campus Gate</div>
                        <div className="text-[9px] text-slate-500 font-mono">Verified 07:52 AM</div>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                          <Baby className="w-3 h-3 text-indigo-600" />
                          <span>Early Years</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 mt-1">Nursery 2 Rubric</div>
                        <div className="text-[9px] text-indigo-600 font-semibold">Commentary Mode</div>
                      </div>
                    </div>

                    {/* Broadsheet / Table Preview */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-[#1D4ED8]" />
                          <span className="font-semibold text-slate-700">Senior Secondary CA & Exam Broadsheet</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">SS2 Arm A • WAEC Computed</span>
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
                            <th className="p-2">Student</th>
                            <th className="p-2 text-center">CA1 (20)</th>
                            <th className="p-2 text-center">CA2 (20)</th>
                            <th className="p-2 text-center">Exam (60)</th>
                            <th className="p-2 text-center font-bold text-slate-900">Total</th>
                            <th className="p-2 text-center">Grade</th>
                            <th className="p-2 text-right">Fee Clearance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                          <tr>
                            <td className="p-2 font-medium text-slate-900">Chidinma Okafor</td>
                            <td className="p-2 text-center font-mono font-medium">18</td>
                            <td className="p-2 text-center font-mono font-medium">19</td>
                            <td className="p-2 text-center font-mono font-medium">52</td>
                            <td className="p-2 text-center font-mono font-bold text-slate-900">89</td>
                            <td className="p-2 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                A1
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Cleared
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2 font-medium text-slate-900">Tunde Bakare</td>
                            <td className="p-2 text-center font-mono font-medium">16</td>
                            <td className="p-2 text-center font-mono font-medium">17</td>
                            <td className="p-2 text-center font-mono font-medium">48</td>
                            <td className="p-2 text-center font-mono font-bold text-slate-900">81</td>
                            <td className="p-2 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                A1
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Pending
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

      {/* 2. SIX CORE CAPABILITIES ENTERPRISE GRID */}
      <section id="features" className="py-20 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-[#1D4ED8] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Complete Operational Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Built for the Rigor of Nigerian Schools
            </h2>
            <p className="text-[#475569] text-base leading-relaxed">
              Every tool in Aegis is engineered around real daily friction points—from student dismissal security and teacher punctuality to bursary bank slip clearance and early years Montessori assessments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Capability 1: Safe Pick-Up */}
            <div className="p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Safe Pick-Up & Child Gate Security
                </h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Protect every child at dismissal with daily parent OTPs and <strong>5-hour expiring delegate gate passes</strong> for trusted family drivers or relatives. Security guards scan QR codes or type 6-digit OTPs on public unauthenticated gate vouchers.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs font-semibold text-emerald-700">
                <span>Real-Time Gate Audit Log</span>
                <CheckCheck className="w-4 h-4" />
              </div>
            </div>

            {/* Capability 2: Early Years Commentary Grading */}
            <div className="p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <Baby className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Early Years Developmental Commentary Grading
                </h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Tailored for Creche, Kindergarten, and Nursery tiers. Replaces arbitrary numbers with 5 standardized Nigerian developmental domains (Phonics, Numeracy, Motor Skills, Social, Hygiene) using quick-tap mastery pills and narrative observations.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs font-semibold text-indigo-700">
                <span>Emerging • Developing • Proficient • Mastered</span>
              </div>
            </div>

            {/* Capability 3: Automated WAEC/NECO Grading & Broadsheets */}
            <div className="p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-[#1D4ED8]" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Automated WAEC/NECO Grading & Broadsheets
                </h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Full 33-tier Nigerian class engine spanning Creche through SS3 Arm F. Rapid spreadsheet score entry for CA1 (20), CA2 (20), and Exam (60) with instant class rankings and printable terminal report cards.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs font-semibold text-[#1D4ED8]">
                <span>A1 to F9 Official Standards</span>
                <Award className="w-4 h-4" />
              </div>
            </div>

            {/* Capability 4: Geofenced QR Staff Clock-In */}
            <div className="p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Geofenced QR Staff Clock-In & Punctuality Audit
                </h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Eliminate expensive biometric hardware failures. Teachers scan a printable gate/staffroom QR poster with automatic <strong>150m GPS campus geofencing</strong>, official resumption cutoff tracking, and admin audit rolls.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs font-semibold text-amber-700">
                <span>Zero Hardware • Mobile Native</span>
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {/* Capability 5: Naira Fee Ledger & Receipt Verification */}
            <div className="p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Naira Fee Ledger & Receipt Verification
                </h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Termly tuition fee schedules with itemized breakdown. Parents upload bank transfer slips directly from their phones, and bursars approve partial/full payments with automatic result locking for outstanding debts.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs font-semibold text-emerald-700">
                <span>Automated Result Clearance Gate</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            {/* Capability 6: 60-Second Self-Service Multi-Tenant Onboarding */}
            <div className="p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-slate-700" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  60-Second Self-Service Multi-Tenant Onboarding
                </h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Proprietors register and immediately receive an isolated tenant environment with an official <strong>AEGIS-XXXX</strong> invite code, seeded class hierarchies, Super Admin credentials, NDPA 2023 compliance, and native Android + Web access.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs font-semibold text-slate-800">
                <span>Instant Provisioning • Multi-Campus</span>
                <Smartphone className="w-4 h-4" />
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
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <img
                  src="/aegis-logo.png"
                  alt="Aegis Logo"
                  className="h-8 w-8 object-contain"
                />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Aegis Institutional Platform
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Ready to elevate your school’s operations?
              </h3>
              <p className="text-slate-300 text-sm max-w-xl">
                Register your school in 60 seconds or sign in to manage scores, track attendance, and secure child dismissals.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <Link
                href="/register-school"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-xs"
              >
                <span>Register Your School Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition border border-slate-700"
              >
                <span>Sign In to Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
