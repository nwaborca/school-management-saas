'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { SchoolLogo } from '@/components/SchoolLogo';
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  GraduationCap,
  Users,
  LogOut,
  MapPin,
  QrCode,
  ArrowRight,
  RefreshCw,
  Search,
  Check,
  Phone,
} from 'lucide-react';
import { PickupPass, StudentProfile } from '@/types';

export default function GateSecurityPage() {
  const router = useRouter();
  const {
    currentUser,
    currentSchool,
    schoolInfo,
    isAuthReady,
    logout,
    pickupPasses = [],
    students = [],
    classes = [],
    verifyAndHandoverPass,
    confirmGateRelease,
    clockInStaff,
    clockOutStaff,
    staffAttendance = [],
  } = useApp();

  // Route Guard: Strictly allow gate_security (and admin for oversight)
  useEffect(() => {
    if (!isAuthReady) return;
    if (!currentUser) {
      router.push('/login');
    } else if (currentUser.role === 'student') {
      router.push('/student-hub');
    } else if (currentUser.role === 'teacher') {
      router.push('/academic-hub');
    }
  }, [currentUser, isAuthReady, router]);

  // Code input & search state
  const [passInput, setPassInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeVerification, setActiveVerification] = useState<{
    pass: PickupPass;
    student?: StudentProfile;
    status: 'AUTHORIZED' | 'INVALID' | 'EXPIRED' | 'ALREADY_RELEASED' | 'ALREADY_USED';
    message: string;
  } | null>(null);

  const [confirmingRelease, setConfirmingRelease] = useState(false);
  const [releaseSuccessNotice, setReleaseSuccessNotice] = useState<string | null>(null);

  // Staff gate clock-in state
  const [clockingIn, setClockingIn] = useState(false);
  const [clockNotice, setClockNotice] = useState<string | null>(null);

  // Client-mounted today date string (prevents Next.js prerender dynamic date errors)
  const [todayDateStr, setTodayDateStr] = useState<string>('');

  useEffect(() => {
    setTodayDateStr(new Date().toISOString().split('T')[0]);
  }, []);

  const activeSchoolId = currentSchool?.id || currentUser?.school_id;

  // Gate releases today for current school
  const todayReleases = useMemo(() => {
    return pickupPasses
      .filter((p) => {
        if (p.school_id !== activeSchoolId) return false;
        const gateTime = p.gate_released_at || p.picked_up_at;
        return (
          (p.status === 'RELEASED_AT_GATE' || p.status === 'USED') &&
          gateTime &&
          gateTime.startsWith(todayDateStr)
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.gate_released_at || a.picked_up_at || a.created_at).getTime();
        const timeB = new Date(b.gate_released_at || b.picked_up_at || b.created_at).getTime();
        return timeB - timeA;
      });
  }, [pickupPasses, activeSchoolId, todayDateStr]);

  // Check if current security guard has clocked in today
  const myTodayAttendance = useMemo(() => {
    if (!currentUser) return null;
    return staffAttendance.find(
      (a) =>
        a.teacher_id === currentUser.id &&
        a.school_id === activeSchoolId &&
        a.check_in_time.startsWith(todayDateStr)
    );
  }, [staffAttendance, currentUser, activeSchoolId, todayDateStr]);

  // Keypad append
  const handleKeypadPress = (digit: string) => {
    if (passInput.length < 6) {
      setPassInput((prev) => prev + digit);
    }
  };

  const handleKeypadBackspace = () => {
    setPassInput((prev) => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setPassInput('');
    setActiveVerification(null);
    setReleaseSuccessNotice(null);
  };

  // Perform Pass Verification
  const handleVerifyPass = async (codeToVerify?: string) => {
    const raw = (codeToVerify || passInput).trim();
    if (!raw) return;

    setVerifying(true);
    setReleaseSuccessNotice(null);

    try {
      // 1. First check local memory / matches
      let matchedPass = pickupPasses.find((p) => {
        if (p.school_id !== activeSchoolId) return false;
        if (p.otp_code === raw) return true;
        if (p.qr_token === raw || raw.includes(p.qr_token)) return true;
        return false;
      });

      // If already released at gate
      if (matchedPass && matchedPass.status === 'RELEASED_AT_GATE') {
        const std = students.find((s) => s.id === matchedPass!.student_id);
        setActiveVerification({
          pass: matchedPass,
          student: std,
          status: 'ALREADY_RELEASED',
          message: `Student already safely released through the gate at ${
            matchedPass.gate_released_at
              ? new Date(matchedPass.gate_released_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'earlier today'
          }.`,
        });
        setVerifying(false);
        return;
      }

      // Call verifyAndHandoverPass to validate OTP/QR against database
      const res = await verifyAndHandoverPass({
        codeOrToken: raw,
        verifiedByStaffId: currentUser?.id,
      });

      if (res.success && res.pass) {
        const std = res.student || students.find((s) => s.id === res.pass!.student_id);
        setActiveVerification({
          pass: res.pass,
          student: std,
          status: 'AUTHORIZED',
          message: 'Valid Safe Pick-Up Pass! Authorized for student exit.',
        });
      } else {
        const statusType =
          res.reason === 'EXPIRED'
            ? 'EXPIRED'
            : res.reason === 'USED'
            ? 'ALREADY_USED'
            : 'INVALID';

        setActiveVerification({
          pass: res.pass || (matchedPass as any) || {
            id: 'unverified',
            school_id: activeSchoolId || '',
            student_id: '',
            pass_type: 'DAILY_PARENT',
            otp_code: raw,
            qr_token: raw,
            status: 'EXPIRED',
            created_at: new Date().toISOString(),
            expires_at: new Date().toISOString(),
          },
          student: res.student,
          status: statusType,
          message: res.error || 'Invalid or unverified pass. Do NOT release student.',
        });
      }
    } catch (err: any) {
      setActiveVerification({
        pass: {
          id: 'error',
          school_id: activeSchoolId || '',
          student_id: '',
          pass_type: 'DAILY_PARENT',
          otp_code: raw,
          qr_token: raw,
          status: 'EXPIRED',
          created_at: new Date().toISOString(),
          expires_at: new Date().toISOString(),
        },
        status: 'INVALID',
        message: err?.message || 'Error occurred while verifying pass.',
      });
    } finally {
      setVerifying(false);
    }
  };

  // 1-Tap Confirm Gate Release
  const handleConfirmGateRelease = async () => {
    if (!activeVerification?.pass?.id) return;
    setConfirmingRelease(true);

    try {
      const res = await confirmGateRelease({
        passId: activeVerification.pass.id,
        securityStaffId: currentUser?.id,
        securityStaffName: currentUser?.full_name,
      });

      if (res.success && res.pass) {
        setReleaseSuccessNotice(
          `✓ Gate Exit Confirmed! ${
            activeVerification.student?.full_name || 'Student'
          } has officially exited the campus premises.`
        );
        setActiveVerification({
          ...activeVerification,
          pass: res.pass,
          status: 'ALREADY_RELEASED',
          message: 'Gate Exit Recorded Successfully.',
        });
        setPassInput('');
      }
    } catch (err: any) {
      console.error('Error confirming gate release:', err);
    } finally {
      setConfirmingRelease(false);
    }
  };

  // 1-Tap Gate Clock-In
  const handleGateClockIn = async () => {
    if (!activeSchoolId) return;
    setClockingIn(true);
    setClockNotice(null);

    try {
      const payload = `AEGIS_ATTENDANCE:${activeSchoolId}:${currentSchool?.invite_code || ''}`;
      const res = await clockInStaff({
        scannedPayload: payload,
      });

      if (res.success) {
        setClockNotice('✓ Clocked in at gate checkpoint successfully.');
        setTimeout(() => setClockNotice(null), 4000);
      } else {
        setClockNotice(res.message || 'Clock in failed.');
      }
    } catch (err: any) {
      setClockNotice(err?.message || 'Error recording clock-in.');
    } finally {
      setClockingIn(false);
    }
  };

  const handleGateClockOut = async () => {
    if (!myTodayAttendance?.id) return;
    setClockingIn(true);
    try {
      const res = await clockOutStaff(myTodayAttendance.id);
      if (res.success) {
        setClockNotice('✓ Clocked out successfully. Safe journey!');
        setTimeout(() => setClockNotice(null), 4000);
      } else {
        setClockNotice(res.message || 'Clock out failed.');
      }
    } finally {
      setClockingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <SchoolLogo
            logoUrl={currentSchool?.logo_url || currentSchool?.logoUrl}
            name={currentSchool?.name || schoolInfo.name}
            className="w-8 h-8 object-contain shrink-0"
          />
          <div>
            <div className="text-xs font-black tracking-tight text-white uppercase flex items-center gap-1.5">
              <span>{currentSchool?.name || schoolInfo.name}</span>
              <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded text-[9px] font-mono">
                GATE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Sec: {currentUser?.full_name || 'Guard'} • {currentSchool?.invite_code || 'AEGIS'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {myTodayAttendance ? (
            <button
              onClick={handleGateClockOut}
              disabled={clockingIn || Boolean(myTodayAttendance.clock_out_time)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 border border-slate-700 disabled:opacity-50"
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{myTodayAttendance.clock_out_time ? 'Clocked Out' : 'Clock Out'}</span>
            </button>
          ) : (
            <button
              onClick={handleGateClockIn}
              disabled={clockingIn}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Clock className="w-3 h-3" />
              <span>{clockingIn ? 'Clocking In...' : 'Gate Clock In'}</span>
            </button>
          )}

          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Gate Control Container */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
        {/* Status Toast Notice */}
        {clockNotice && (
          <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{clockNotice}</span>
          </div>
        )}

        {releaseSuccessNotice && (
          <div className="p-4 rounded-xl bg-emerald-950/90 border-2 border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center gap-2.5 shadow-lg animate-in zoom-in-95">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{releaseSuccessNotice}</span>
          </div>
        )}

        {/* Gate Checkpoint Verification Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Gate Dismissal Checkpoint
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {todayReleases.length} Released Today
            </span>
          </div>

          {/* 6-Digit Code / Token Display Input */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Enter 6-Digit Pick-Up Pass Code
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={6}
                value={passInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPassInput(val);
                  if (val.length === 6) {
                    handleVerifyPass(val);
                  }
                }}
                placeholder="• • • • • •"
                className="w-full bg-slate-900 border-2 border-slate-700 focus:border-indigo-500 rounded-xl py-3 px-4 text-center font-mono text-2xl tracking-[0.4em] font-black text-white placeholder:text-slate-600 focus:outline-none transition shadow-inner"
              />
              {passInput && (
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="absolute right-3 top-3.5 p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleVerifyPass()}
              disabled={verifying || !passInput.trim()}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md"
            >
              <Search className="w-4 h-4" />
              <span>{verifying ? 'Verifying Pass...' : 'Verify Pass Code'}</span>
            </button>
            <button
              type="button"
              onClick={handleKeypadClear}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* Quick Keypad for Touchscreens / Mobile APK */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'C') handleKeypadClear();
                  else if (k === '⌫') handleKeypadBackspace();
                  else handleKeypadPress(k);
                }}
                className={`py-3 rounded-xl font-mono text-base font-bold transition cursor-pointer active:scale-95 ${
                  k === 'C'
                    ? 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-900/50'
                    : k === '⌫'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 text-lg'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Verification Result Card */}
        {activeVerification && (
          <div
            className={`p-5 rounded-2xl border-2 space-y-4 animate-in zoom-in-95 shadow-2xl ${
              activeVerification.status === 'AUTHORIZED'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-100'
                : activeVerification.status === 'ALREADY_RELEASED'
                ? 'bg-blue-950/60 border-blue-500 text-blue-100'
                : 'bg-rose-950/70 border-rose-500 text-rose-100'
            }`}
          >
            {/* Status Header Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                {activeVerification.status === 'AUTHORIZED' ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <span className="text-sm font-black tracking-wide text-emerald-300 uppercase">
                      AUTHORIZED FOR EXIT
                    </span>
                  </>
                ) : activeVerification.status === 'ALREADY_RELEASED' ? (
                  <>
                    <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0" />
                    <span className="text-sm font-black tracking-wide text-blue-300 uppercase">
                      STUDENT ALREADY RELEASED
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                    <span className="text-sm font-black tracking-wide text-rose-300 uppercase">
                      DO NOT RELEASE — {activeVerification.status}
                    </span>
                  </>
                )}
              </div>

              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10">
                OTP: {activeVerification.pass.otp_code}
              </span>
            </div>

            {/* Student & Guardian Details */}
            {activeVerification.student && (
              <div className="space-y-3 bg-black/30 rounded-xl p-3.5 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Student Name
                    </span>
                    <span className="text-base font-extrabold text-white">
                      {activeVerification.student.full_name}
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded-md bg-white/10 text-white font-mono text-xs font-bold">
                    {activeVerification.student.class_grade || 'Class'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/10">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Reg Number</span>
                    <span className="font-mono font-bold text-white">
                      {activeVerification.student.reg_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Parent Phone</span>
                    <span className="font-mono text-white">
                      {activeVerification.student.parent_phone}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Authorized Collector</span>
                    <span className="font-bold text-white text-xs">
                      {activeVerification.pass.delegate_name || activeVerification.student.parent_name || 'Registered Parent'}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activeVerification.pass.pass_type === 'DAILY_PARENT'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {activeVerification.pass.pass_type === 'DAILY_PARENT' ? 'Daily Parent Pass' : '5H Delegate Pass'}
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs leading-relaxed opacity-90">{activeVerification.message}</p>

            {/* 1-Tap Action: Confirm Gate Release */}
            {activeVerification.status === 'AUTHORIZED' && (
              <button
                type="button"
                onClick={handleConfirmGateRelease}
                disabled={confirmingRelease}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-950 disabled:opacity-50"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>{confirmingRelease ? 'Confirming Gate Exit...' : 'Confirm Gate Release (Release Student)'}</span>
              </button>
            )}
          </div>
        )}

        {/* Today's Gate Exit Log */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Today's Gate Release Activity ({todayReleases.length})</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500">{todayDateStr}</span>
          </div>

          {todayReleases.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-900/50 rounded-xl">
              No students checked out at the gate yet today.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 max-h-60 overflow-y-auto pr-1">
              {todayReleases.map((pass) => {
                const std = students.find((s) => s.id === pass.student_id);
                const timeStr = pass.gate_released_at || pass.picked_up_at;
                return (
                  <div key={pass.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">
                        {std?.full_name || 'Enrolled Student'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {std?.class_grade || 'Class'} • With: {pass.delegate_name || 'Parent'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <Check className="w-3 h-3" />
                        <span>Released</span>
                      </span>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {timeStr ? new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
