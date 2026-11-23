'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import {
  GraduationCap,
  ArrowRight,
  AlertCircle,
  Lock,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  CreditCard,
  Building2,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginStudent, loginStaff, schoolInfo, currentSchool } = useApp();

  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const [inviteCode, setInviteCode] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Warm up and prefetch target dashboard bundles immediately on mount
  useEffect(() => {
    router.prefetch('/admin');
    router.prefetch('/admin-hub');
    router.prefetch('/academic');
    router.prefetch('/academic-hub');
    router.prefetch('/student');
    router.prefetch('/student-hub');
    router.prefetch('/gate');
  }, [router]);

  // Hidden Founder Console Secret Trigger
  // 1. 5-tap counter with generous 3-second rolling window and visual feedback
  const [crestTaps, setCrestTaps] = useState(0);
  const crestTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const registerCrestTap = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (crestTimerRef.current) clearTimeout(crestTimerRef.current);

    setCrestTaps((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        router.push('/founder');
        return 0;
      }
      return next;
    });

    // Reset after 3 seconds of inactivity
    crestTimerRef.current = setTimeout(() => {
      setCrestTaps(0);
    }, 3000);
  };

  // 2. NDPA Footer 5-taps OR 1.5-second long-press trigger
  const [ndpaTaps, setNdpaTaps] = useState(0);
  const ndpaTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const pressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleNdpaTap = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (ndpaTimerRef.current) clearTimeout(ndpaTimerRef.current);

    setNdpaTaps((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        router.push('/founder');
        return 0;
      }
      return next;
    });

    ndpaTimerRef.current = setTimeout(() => {
      setNdpaTaps(0);
    }, 3000);
  };

  const handleNdpaPressStart = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      router.push('/founder');
    }, 1500);
  };

  const handleNdpaPressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInvite = inviteCode.trim().toUpperCase();
    if (!cleanInvite) {
      setError('Please enter your School Invite Code (provided by your school administrator).');
      return;
    }

    setLoading(true);

    try {
      const res = await loginStudent(regNumber, pin, cleanInvite);
      if (res.success) {
        router.replace('/student-hub');
      } else {
        setError(res.message || 'Invalid registration number or PIN.');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInvite = inviteCode.trim().toUpperCase();
    if (!cleanInvite) {
      setError('Please enter your School Invite Code (provided by your school administrator).');
      return;
    }

    setLoading(true);

    try {
      const res = await loginStaff(username, password, cleanInvite);
      if (res.success) {
        const targetRoute =
          res.role === 'gate_security'
            ? '/gate'
            : res.role === 'admin'
            ? '/admin-hub'
            : '/academic-hub';
        router.replace(targetRoute);
      } else {
        setError(res.message || 'Invalid username or password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Left Form Panel: Pure White, Linear/Stripe Precision */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white border-r border-[#E2E8F0]">
        <div className="w-full max-w-md space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={registerCrestTap}
                onPointerDown={registerCrestTap}
                className={`focus:outline-none cursor-pointer transition-all select-none active:scale-90 ${
                  crestTaps >= 3 ? 'ring-2 ring-blue-500/50 rounded-xl scale-105' : ''
                }`}
                title="Aegis Crest"
                aria-label="Aegis Crest"
              >
                <img
                  src="/aegis-logo.png"
                  alt="Aegis Logo"
                  className="h-10 w-10 object-contain shrink-0 select-none pointer-events-none"
                />
              </button>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Aegis Institutional Portal</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Sign In to Your Account
            </h1>
            <p className="text-sm text-[#475569] mt-1.5">
              Access continuous assessment scores, official terminal broadsheets, and tuition clearance.
            </p>
          </div>

          {/* Clean Segmented Tab Switcher */}
          <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-white text-[#0F172A] font-bold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Student / Parent
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('staff');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-white text-[#0F172A] font-bold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Staff / Admin
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Mandatory Multi-Tenant School Invite Code Identifier */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-[#0F172A]">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>School Invite Code</span>
              </span>
              <span className="text-[10px] font-semibold text-rose-500">Required</span>
            </label>
            <input
              type="text"
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="e.g. AEGIS-XXXX"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-mono tracking-wider text-[#0F172A] uppercase placeholder:text-slate-400 placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>

          {activeTab === 'student' ? (
            <form onSubmit={handleStudentLogin} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Student Registration Number
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="e.g. STU-2026-841"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-mono tabular-nums text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  4-Digit Access PIN
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-mono tabular-nums text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent placeholder:text-slate-400"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-xs mt-2"
              >
                <span>{loading ? 'Verifying PIN...' : 'Sign In as Student / Parent'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleStaffLogin} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Admin Email Address, Username, or Staff ID
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="e.g. admin@school.ng, admin, or ADM/2026/001"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Proprietors: use the email address or admin username you registered with.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent placeholder:text-slate-400"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-xs mt-2"
              >
                <span>{loading ? 'Authenticating Staff...' : 'Sign In as Staff / Admin'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Register New School Prompt */}
          <div className="pt-2 text-center">
            <span className="text-xs text-slate-500">New institution? </span>
            <Link
              href="/register-school"
              className="text-xs font-bold text-[#1D4ED8] hover:underline inline-flex items-center gap-1"
            >
              <span>Register Your School</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Subdued Security Notice with Secret APK Founder Trigger */}
          <div className="pt-4 border-t border-slate-200 text-center select-none">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
              <button
                type="button"
                onClick={handleNdpaTap}
                onPointerDown={handleNdpaPressStart}
                onPointerUp={handleNdpaPressEnd}
                onPointerCancel={handleNdpaPressEnd}
                className={`focus:outline-none p-1 rounded-md transition cursor-pointer select-none active:scale-90 ${
                  ndpaTaps >= 3 ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-300' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="NDPA Security"
                aria-label="NDPA Security"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
              <span>NDPA 2023 Compliant • Role-based TLS 1.3 encrypted authentication</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right Brand & Enterprise Reliability Panel */}
      <div className="hidden md:flex md:w-1/2 bg-[#0F172A] text-white p-12 lg:p-16 flex-col justify-between">
        <div className="space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 text-xs text-slate-400 font-mono uppercase tracking-wider">
            <span>Aegis Cloud Architecture</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-snug">
            Institutional reliability for continuous grading and school bursary governance.
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed">
            Eliminate end-of-term calculation errors and manual bank slip tracking with our automated broadsheet matrix and student clearance workflows.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Instant Weighted Result Calculations</div>
                <div className="text-[11px] text-slate-400">
                  Automated CA1 (20) + CA2 (20) + Exam (60) totaling with official WAEC/NECO grade bands.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-blue-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Bursary Clearance Verification Gates</div>
                <div className="text-[11px] text-slate-400">
                  Enforces automated result locking until bursar audits and confirms student tuition receipts.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">33-Tier Class Progression</div>
                <div className="text-[11px] text-slate-400">
                  Full Nigerian structure spanning Early Childhood, Primary, and Senior Secondary Arms A to F.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
          <span>{schoolInfo.name} • {schoolInfo.academic_year}</span>
          <span>Aegis SaaS Platform</span>
        </div>
      </div>
    </div>
  );
}
