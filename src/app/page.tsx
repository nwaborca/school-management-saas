'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Hero3DCanvas } from '@/components/3d/Hero3DCanvas';
import {
  GraduationCap,
  KeyRound,
  FileText,
  DollarSign,
  Shield,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Users,
  Award,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  const { schoolInfo, isAuthenticated, currentUser } = useApp();

  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 pb-20 transition-colors duration-200">
      {/* HERO SECTION */}
      <section className="relative pt-10 pb-16 md:pt-20 md:pb-24 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-500 text-xs font-semibold shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-gray-700 dark:text-gray-200">Premier Institutional Portal • Session {schoolInfo.academic_year}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black text-gray-900 dark:text-gray-50 tracking-tight leading-tight">
                Academic Excellence & <br />
                <span className="text-amber-600 dark:text-amber-500">Student Governance System</span>
              </h1>

              <p className="text-gray-700 dark:text-gray-200 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Official Nigerian school management architecture tailored for <strong className="text-gray-900 dark:text-gray-50 font-semibold">Creche through SS3 (Arms A–F)</strong>. Authenticate securely using your assigned <strong className="text-gray-900 dark:text-gray-50 font-semibold">Registration Number</strong> and <strong className="text-gray-900 dark:text-gray-50 font-semibold">Access PIN</strong>. Access continuous assessment scores (CA1, CA2, Terminal Exam), certified report sheets, and term fee clearance in <strong className="text-gray-900 dark:text-gray-50 font-semibold">Naira (₦)</strong>.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-sm border border-rose-800 flex items-center justify-center gap-2 transition shadow-md"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Student & Staff Login</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </Link>

                <Link
                  href="/student"
                  className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white dark:bg-gray-900/90 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Terminal Results Portal</span>
                </Link>
              </div>

              {/* Academic Highlights */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <span className="text-gray-700 dark:text-gray-200 font-medium">PIN-Based Auth (No Email Needed)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-500" />
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Responsive Mobile View</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span className="text-gray-700 dark:text-gray-200 font-medium">WAEC / NECO Standards</span>
                </div>
              </div>
            </div>

            {/* Right Emblem Canvas */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/80 p-2 shadow-2xl backdrop-blur-sm">
                <Hero3DCanvas schoolName={schoolInfo.name} motto={schoolInfo.motto} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 ROLE BLUEPRINTS */}
      <section className="py-14 bg-white/70 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-50 tracking-tight">
              Institutional Governance Architecture
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Role-segregated environments for students, subject educators, and administrative bursars.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student & Parent */}
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">Student & Parent Portal</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Log in via Reg Number and PIN. View WAEC-standard broadsheet marks, term invoices, upload bank transfer proofs, and unlock printable report cards.
              </p>
              <div className="pt-2">
                <Link
                  href="/student"
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 inline-flex items-center gap-1"
                >
                  <span>Access Student Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Teacher Academic Hub */}
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-rose-700 dark:text-rose-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">Faculty Academic Hub</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Spreadsheet-like score grading for CA1 (20), CA2 (20), and Terminal Exam (60). Dynamic senior secondary stream specialization and form teacher broadsheets.
              </p>
              <div className="pt-2">
                <Link
                  href="/academic"
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 inline-flex items-center gap-1"
                >
                  <span>Open Grading Matrix</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Admin Command Center */}
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">Admin Command & Bursar Hub</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Manage all 33 class arms (Creche to SS3 Arm F), build itemized fee schedules in Naira (₦), audit transfer receipts, and manage faculty credentials.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin"
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 inline-flex items-center gap-1"
                >
                  <span>Launch Admin Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
