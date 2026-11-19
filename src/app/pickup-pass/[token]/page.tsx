'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ShieldCheck, Clock, AlertTriangle, CheckCircle2, User, Building2, Calendar, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PublicGatePassData {
  pass_type: 'DAILY_PARENT' | 'DELEGATE_5H';
  delegate_name?: string | null;
  otp_code: string;
  qr_token: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  expires_at: string;
  picked_up_at?: string | null;
  student_name: string;
  student_class: string;
  school_name: string;
}

function PublicPickupPassContent() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';

  const [passData, setPassData] = useState<PublicGatePassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setErrorMsg('No pass token provided.');
      setLoading(false);
      return;
    }

    const fetchPublicPass = async () => {
      setLoading(true);
      setErrorMsg(null);

      if (!isSupabaseConfigured()) {
        // Fallback mock pass for offline/dev demo
        setPassData({
          pass_type: 'DELEGATE_5H',
          delegate_name: 'Authorized Collector',
          otp_code: '482910',
          qr_token: token,
          status: 'ACTIVE',
          expires_at: new Date(Date.now() + 3.5 * 3600 * 1000).toISOString(),
          student_name: 'Student Scholar',
          student_class: 'SS1 Arm A',
          school_name: 'Aegis Academy Nigeria',
        });
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch pass strictly by qr_token
        const { data: pass, error: passErr } = await supabase
          .from('pickup_passes')
          .select('id, school_id, student_id, pass_type, delegate_name, otp_code, qr_token, status, expires_at, picked_up_at')
          .eq('qr_token', token)
          .maybeSingle();

        if (passErr || !pass) {
          setErrorMsg('Invalid or non-existent pick-up pass.');
          setLoading(false);
          return;
        }

        // 2. Fetch student minimal display fields only (NO grades, NO fees, NO pins)
        const { data: student } = await supabase
          .from('students')
          .select('full_name, class_grade')
          .eq('id', pass.student_id)
          .maybeSingle();

        // 3. Fetch school name
        const { data: school } = await supabase
          .from('schools')
          .select('name')
          .eq('id', pass.school_id)
          .maybeSingle();

        setPassData({
          pass_type: pass.pass_type,
          delegate_name: pass.delegate_name,
          otp_code: pass.otp_code,
          qr_token: pass.qr_token,
          status: pass.status,
          expires_at: pass.expires_at,
          picked_up_at: pass.picked_up_at,
          student_name: student?.full_name || 'Enrolled Student',
          student_class: student?.class_grade || 'Primary / Secondary',
          school_name: school?.name || 'Aegis Academy',
        });
      } catch (err: any) {
        setErrorMsg('Failed loading gate pass details.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicPass();
  }, [token]);

  // Live countdown timer for active delegate pass
  useEffect(() => {
    if (!passData || passData.status !== 'ACTIVE') return;

    const updateTimer = () => {
      const diffMs = new Date(passData.expires_at).getTime() - Date.now();
      if (diffMs <= 0) {
        setTimeLeft('Expired');
        setPassData((prev) => (prev ? { ...prev, status: 'EXPIRED' } : null));
      } else {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m remaining`);
        } else {
          setTimeLeft(`${minutes}m ${seconds}s remaining`);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [passData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-700">Verifying Gate Pass Security Token...</p>
        </div>
      </div>
    );
  }

  const isExpired = !passData || passData.status === 'EXPIRED' || new Date(passData.expires_at) < new Date();
  const isUsed = passData?.status === 'USED';

  if (errorMsg || !passData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Invalid or Missing Pass</h1>
          <p className="text-xs text-slate-500">{errorMsg || 'This link is no longer valid or does not exist.'}</p>
        </div>
      </div>
    );
  }

  // QR Payload structured format for gate scanning
  const qrPayload = `AEGIS_PICKUP:${passData.otp_code}:${passData.qr_token}`;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Top Institutional Header */}
        <div className="bg-[#0F172A] text-white p-6 text-center space-y-1 relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-400/30">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Digital Dismissal Gate Pass</span>
          </div>
          <h2 className="text-base font-bold tracking-tight text-white">{passData.school_name}</h2>
          <p className="text-[11px] text-slate-400">Child Safe Pick-Up Verification Voucher</p>
        </div>

        {/* Status Banner */}
        {isUsed ? (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-4 text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-300">
              <CheckCircle2 className="w-4 h-4 text-rose-600" />
              <span>PASS ALREADY USED</span>
            </span>
            <p className="text-[11px] text-rose-600">
              This child handover was already confirmed {passData.picked_up_at ? `at ${new Date(passData.picked_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'earlier today'}.
            </p>
          </div>
        ) : isExpired ? (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-4 text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>PASS EXPIRED</span>
            </span>
            <p className="text-[11px] text-rose-600">
              This pick-up pass has expired. The parent must generate a new delegate pass.
            </p>
          </div>
        ) : (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>VALID & ACTIVE</span>
            </span>
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-700">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeft}</span>
            </div>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* OTP Code Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Gate Handover 6-Digit Code
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-[#0F172A] py-1">
              {passData.otp_code}
            </div>
            <p className="text-[11px] text-slate-500">
              Present this 6-digit code or the QR code below to the school security or teacher.
            </p>
          </div>

          {/* Scannable QR Code */}
          <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-100">
              <QRCodeSVG
                value={qrPayload}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Token: {passData.qr_token.substring(0, 16)}...
            </span>
          </div>

          {/* Child & Collector Information Card */}
          <div className="space-y-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Student / Child:</span>
                <span className="font-bold text-slate-900 text-right">{passData.student_name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Class / Arm:</span>
                <span className="font-bold text-slate-900 text-right">{passData.student_class}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Pass Type:</span>
                <span className="font-bold text-blue-700">
                  {passData.pass_type === 'DAILY_PARENT' ? 'Daily Parent Pick-Up' : '5-Hour Delegate Pass'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Authorized Collector:</span>
                <span className="font-bold text-slate-900 text-right">
                  {passData.delegate_name || 'Registered Parent / Guardian'}
                </span>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-400 pt-2">
            Protected by Aegis Dismissal Governance • Single-Use Security Token
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PublicPickupPassPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full space-y-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-700">Loading Gate Pass...</p>
          </div>
        </div>
      }
    >
      <PublicPickupPassContent />
    </Suspense>
  );
}

