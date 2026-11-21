'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  LogOut,
  RefreshCw,
  Sparkles,
  Search,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { SchoolAccessStatus, SchoolPlanLabel } from '@/types';

interface ManagedSchool {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  access_status: SchoolAccessStatus;
  plan_label: SchoolPlanLabel;
  access_expires_at: string | null;
  is_expired: boolean;
  is_master_demo: boolean;
  student_count: number;
  teacher_count: number;
}

export default function FounderConsolePage() {
  const [founderPassword, setFounderPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [schools, setSchools] = useState<ManagedSchool[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Persist session locally for convenience during founder review
  useEffect(() => {
    const savedPass = sessionStorage.getItem('aegis_founder_pass');
    if (savedPass) {
      setFounderPassword(savedPass);
      handleUnlockWithPassword(savedPass);
    }
  }, []);

  const handleUnlockWithPassword = async (pass: string) => {
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/founder/manage-schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', founderPassword: pass }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('aegis_founder_pass', pass);
        setSchools(data.schools || []);
      } else {
        setAuthError(data.message || 'Invalid Founder Master Access Password.');
        sessionStorage.removeItem('aegis_founder_pass');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Network error verifying founder credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUnlockWithPassword(founderPassword);
  };

  const refreshSchools = async () => {
    if (!founderPassword) return;
    setLoadingSchools(true);
    setActionError(null);
    try {
      const res = await fetch('/api/founder/manage-schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', founderPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSchools(data.schools || []);
      } else {
        setActionError(data.message || 'Failed to refresh school list.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error communicating with founder server.');
    } finally {
      setLoadingSchools(false);
    }
  };

  const handleAction = async (action: 'approve_free_pilot' | 'renew_paid_term' | 'expire_now', schoolId: string) => {
    setProcessingId(schoolId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch('/api/founder/manage-schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, schoolId, founderPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(data.message);
        setTimeout(() => setActionSuccess(null), 4000);
        await refreshSchools();
      } else {
        setActionError(data.message || `Action "${action}" failed.`);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Network error executing founder command.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('aegis_founder_pass');
    setIsAuthenticated(false);
    setFounderPassword('');
    setSchools([]);
  };

  // Filter schools by search query
  const filteredSchools = schools.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.invite_code.toLowerCase().includes(q) ||
      s.access_status.toLowerCase().includes(q)
    );
  });

  // 1. Password Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-950 text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400">
                Aegis Master Operations
              </span>
              <h1 className="text-xl font-extrabold text-white">Founder Console</h1>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Restricted access for Forvica Global Venture leadership. Authorize school pilot activations, term renewals, and multi-tenant access state.
          </p>

          {authError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Founder Master Access Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter Founder Master Password"
                  value={founderPassword}
                  onChange={(e) => setFounderPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600 font-mono"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md"
            >
              <span>{authLoading ? 'Verifying Key...' : 'Unlock Founder Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center">
            <Link href="/login" className="text-xs text-slate-500 hover:text-slate-300">
              ← Return to School Portal Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Active Founder Console Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">Founder Console</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  LIVE GOVERNANCE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Forvica Global Venture • 1-Term Free Pilot Activations & WhatsApp Invoice Renewals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshSchools}
              disabled={loadingSchools}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSchools ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-lg bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock Console</span>
            </button>
          </div>
        </div>

        {/* Global Alert Banners */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Total Schools</div>
            <div className="text-2xl font-black text-white mt-1">{schools.length}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-[11px] text-amber-400 uppercase tracking-wider font-bold">Pending Approval</div>
            <div className="text-2xl font-black text-amber-300 mt-1">
              {schools.filter((s) => s.access_status === 'PENDING_APPROVAL').length}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-[11px] text-emerald-400 uppercase tracking-wider font-bold">Active Terms</div>
            <div className="text-2xl font-black text-emerald-300 mt-1">
              {schools.filter((s) => s.access_status === 'ACTIVE').length}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-[11px] text-rose-400 uppercase tracking-wider font-bold">Concluded / Expired</div>
            <div className="text-2xl font-black text-rose-300 mt-1">
              {schools.filter((s) => s.access_status === 'TERM_EXPIRED' || s.is_expired).length}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search school name, invite code, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        </div>

        {/* School Cards Grid */}
        <div className="space-y-4">
          {filteredSchools.map((school) => {
            const isProcessing = processingId === school.id;
            const isPending = school.access_status === 'PENDING_APPROVAL';
            const isExpired = school.access_status === 'TERM_EXPIRED' || school.is_expired;
            const isActive = school.access_status === 'ACTIVE' && !school.is_expired;

            const expiryFormatted = school.access_expires_at
              ? new Date(school.access_expires_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Permanent Master School';

            return (
              <div
                key={school.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 transition hover:border-slate-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-white">{school.name}</h2>
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                        {school.invite_code}
                      </span>
                      {school.is_master_demo && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          MASTER DEMO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                      <span>Roster: {school.student_count} Students</span>
                      <span>•</span>
                      <span>Faculty: {school.teacher_count} Staff</span>
                      <span>•</span>
                      <span>
                        Registered:{' '}
                        {new Date(school.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5" />
                        <span>AWAITING FOUNDER APPROVAL</span>
                      </span>
                    )}
                    {isActive && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ACTIVE ({school.plan_label === 'FREE_PILOT_TERM' ? 'FREE PILOT' : 'PAID TERM'})</span>
                      </span>
                    )}
                    {isExpired && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>TERM EXPIRED</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Expiry Details */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>Access Expiry: <strong className="text-white">{expiryFormatted}</strong></span>
                  </div>
                  <div className="text-slate-400">
                    Plan Tier: <span className="font-mono text-slate-200 font-semibold">{school.plan_label}</span>
                  </div>
                </div>

                {/* 1-Tap Control Buttons */}
                {!school.is_master_demo ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                    {/* Approve Free Pilot */}
                    <button
                      onClick={() => handleAction('approve_free_pilot', school.id)}
                      disabled={isProcessing}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Approve & Activate Free Pilot (+120 Days)</span>
                    </button>

                    {/* Renew Paid Term */}
                    <button
                      onClick={() => handleAction('renew_paid_term', school.id)}
                      disabled={isProcessing}
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Renew / Extend Paid Term (+120 Days)</span>
                    </button>

                    {/* Expire / Lock Now */}
                    {school.access_status !== 'TERM_EXPIRED' && (
                      <button
                        onClick={() => handleAction('expire_now', school.id)}
                        disabled={isProcessing}
                        className="px-3 py-2 rounded-lg bg-rose-950/70 border border-rose-800/80 hover:bg-rose-900/80 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ml-auto"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lock / Expire Term Now</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic pt-1">
                    Master demo school is permanently active and exempt from term expiry checks.
                  </div>
                )}
              </div>
            );
          })}

          {filteredSchools.length === 0 && (
            <div className="p-12 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
              No registered schools found matching query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
