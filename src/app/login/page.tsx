'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  GraduationCap,
  KeyRound,
  Shield,
  ArrowRight,
  AlertCircle,
  Lock,
  ShieldCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginStudent, loginStaff, schoolInfo } = useApp();

  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const [regNumber, setRegNumber] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = loginStudent(regNumber, pin);
      setLoading(false);
      if (res.success) {
        router.push('/student-hub');
      } else {
        setError(res.message || 'Invalid Student Registration Number or PIN');
      }
    }, 400);
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = loginStaff(username, password);
      setLoading(false);
      if (res.success) {
        if (username.toLowerCase().includes('admin')) {
          router.push('/admin-hub');
        } else {
          router.push('/academic-hub');
        }
      } else {
        setError(res.message || 'Invalid Staff Credentials');
      }
    }, 400);
  };

  const fillDemoStudent = (reg: string, p: string) => {
    setActiveTab('student');
    setRegNumber(reg);
    setPin(p);
    setError(null);
  };

  const fillDemoStaff = (u: string, p: string) => {
    setActiveTab('staff');
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat overflow-hidden" style={{ backgroundImage: "url('/hero-bg.jpg')" }}>
      {/* Readability Overlay over Background Image */}
      <div className="absolute inset-0 bg-slate-50/85 dark:bg-gray-950/80 backdrop-blur-[1px] pointer-events-none transition-colors duration-200" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* School Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-900 border border-rose-800 text-amber-400 mb-1 shadow-lg">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50">{schoolInfo.name}</h1>
          <p className="text-xs text-gray-600 dark:text-gray-300">Institutional Access Portal • PIN Authentication</p>
        </div>

        {/* Card Surface */}
        <div className="bg-white/95 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-4 transition-colors duration-200">
          {/* Prominent NDPA 2023 Statutory Privacy & Minor Data Shield Badge */}
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="leading-snug">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 block text-[11px] uppercase tracking-wider">
                NDPA 2023 Compliant
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                AES-256 Encrypted & NDPC Minor Data Shield Active
              </span>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-900 p-1 border border-gray-200 dark:border-gray-700 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-rose-900 text-amber-300 border border-rose-800 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-rose-900 text-amber-300 border border-rose-800 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Staff / Admin
            </button>
          </div>

          {error && (
            <div className="p-3 mb-5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'student' ? (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Registration Number:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. STU-2026-089"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-3 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  4-Digit Access PIN:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    maxLength={6}
                    placeholder="e.g. 2026"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-3 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-rose-900 hover:bg-rose-800 border border-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md"
              >
                <span>{loading ? 'Verifying Credentials...' : 'Sign In to Student Hub'}</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Staff Username:
                </label>
                <input
                  type="text"
                  required
                  placeholder="admin or teacher"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-3 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Staff Password:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Enter staff password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-3 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-rose-900 hover:bg-rose-800 border border-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md"
              >
                <span>{loading ? 'Authenticating Staff...' : 'Sign In to Staff Console'}</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </form>
          )}

          {/* Preset Demo Logins */}
          <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700 text-xs">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-2.5">
              Instant Demo Presets:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemoStudent('STU-2026-089', '2026')}
                className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 text-left text-[11px] text-gray-700 dark:text-gray-300 transition cursor-pointer"
              >
                <span className="font-bold text-gray-900 dark:text-gray-100 block">Lucas Adeleke</span>
                <span className="text-gray-500 dark:text-gray-400">Paid • STU-2026-089</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoStudent('STU-2026-104', '8832')}
                className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 text-left text-[11px] text-gray-700 dark:text-gray-300 transition cursor-pointer"
              >
                <span className="font-bold text-gray-900 dark:text-gray-100 block">Emeka Okafor</span>
                <span className="text-gray-500 dark:text-gray-400">Pending • STU-2026-104</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoStaff('teacher', 'teacher123')}
                className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 text-left text-[11px] text-gray-700 dark:text-gray-300 transition cursor-pointer"
              >
                <span className="font-bold text-rose-700 dark:text-rose-300 block">Faculty Teacher</span>
                <span className="text-gray-500 dark:text-gray-400">teacher / teacher123</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoStaff('admin', 'admin123')}
                className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 text-left text-[11px] text-gray-700 dark:text-gray-300 transition cursor-pointer"
              >
                <span className="font-bold text-amber-600 dark:text-amber-300 block">Principal / Admin</span>
                <span className="text-gray-500 dark:text-gray-400">admin / admin123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
