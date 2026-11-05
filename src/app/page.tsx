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
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-sm border border-rose-800 flex items-center justify-center gap-2 transition shadow-md"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Access Institutional Portal</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
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
    </div>
  );
}
