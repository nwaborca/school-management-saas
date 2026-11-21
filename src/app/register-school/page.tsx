'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  GraduationCap,
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
  Users,
  CreditCard,
  Sparkles,
  MessageCircle,
  Clock,
} from 'lucide-react';

export default function RegisterSchoolPage() {
  const router = useRouter();
  const { registerSchool } = useApp();

  const [schoolName, setSchoolName] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state with new School Invite Code and Admin Credentials
  const [registeredInviteCode, setRegisteredInviteCode] = useState<string | null>(null);
  const [registeredSchoolName, setRegisteredSchoolName] = useState<string | null>(null);
  const [registeredAdminEmail, setRegisteredAdminEmail] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (password.length < 6) {
        setError('Admin password must be at least 6 characters long.');
        setLoading(false);
        return;
      }

      const res = await registerSchool({
        schoolName,
        adminFullName,
        email,
        phone,
        password,
        address,
      });

      if (res.success && res.inviteCode) {
        setRegisteredInviteCode(res.inviteCode);
        setRegisteredSchoolName(schoolName);
        setRegisteredAdminEmail(email.trim());
      } else {
        setError(res.error || 'Failed to complete school registration. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (registeredInviteCode) {
      navigator.clipboard.writeText(registeredInviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const copyAllCredentials = () => {
    if (!registeredInviteCode) return;
    const summary = `*AEGIS SCHOOL OS — PROPRIETOR ADMIN CREDENTIALS*\n` +
      `Institution: ${registeredSchoolName}\n` +
      `School Invite Code: ${registeredInviteCode}\n` +
      `Admin Login Email: ${registeredAdminEmail}\n` +
      `Role: Proprietor / Super Admin\n` +
      `Portal URL: ${window.location.origin}/login\n\n` +
      `Keep this invite code safe. Teachers, staff, and parents use this code to access your school's dedicated portal.`;
    navigator.clipboard.writeText(summary);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Left Form Panel: Pure White Linear/Stripe aesthetic */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white border-r border-[#E2E8F0]">
        <div className="w-full max-w-lg space-y-6">
          {!registeredInviteCode ? (
            <>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src="/aegis-logo.png"
                    alt="Aegis Logo"
                    className="h-10 w-10 object-contain shrink-0"
                  />
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Self-Service School Provisioning</span>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                  Register Your School
                </h1>
                <p className="text-sm text-[#475569] mt-1.5 leading-relaxed">
                  Join hundreds of Nigerian schools managing 33-tier class broadsheets, Continuous Assessment, and Naira fee clearances.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* School Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    School Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex High School or St. Michael Academy"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent placeholder:text-slate-400"
                    />
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Proprietor / Admin Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Proprietor / School Administrator Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Ngozi Adeleke or Principal John Okafor"
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent placeholder:text-slate-400"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Contact Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="admin@yourschool.ng"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent placeholder:text-slate-400"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Phone Number (+234) *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        placeholder="+2348012345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#0F172A] font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent placeholder:text-slate-400"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Admin Password (min. 6 characters) *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent placeholder:text-slate-400"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* School Address */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    School Location / Campus Address (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Victoria Island, Lagos or Garki 2, Abuja"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent placeholder:text-slate-400"
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-xs mt-3"
                >
                  <span>{loading ? 'Provisioning School Architecture...' : 'Create School & Generate Invite Code'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-3 text-center">
                <span className="text-xs text-slate-500">Already registered your school? </span>
                <Link href="/login" className="text-xs font-bold text-[#1D4ED8] hover:underline">
                  Sign in to Portal
                </Link>
              </div>
            </>
          ) : (
            /* Post-Registration Onboarding Card - Founder Approval & Free Pilot */
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                  Registration Submitted — Awaiting Founder Activation
                </span>
                <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight mt-2">
                  1-Term Free Pilot Verification
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  <strong>{registeredSchoolName}</strong> has been provisioned. In accordance with Founder Access Governance, your school’s 1-Term Free Pilot will be activated immediately once verified by Forvica Global Venture.
                </p>
              </div>

              {/* Comprehensive Credentials Confirmation Card */}
              <div className="p-5 rounded-xl bg-slate-50 border-2 border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Proprietor Master Access Key</span>
                  </div>
                  <button
                    onClick={copyAllCredentials}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAll ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
                  </button>
                </div>

                {/* Details Grid */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium">School Invite Code:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-[#0F172A] text-sm tracking-wider">
                        {registeredInviteCode}
                      </span>
                      <button
                        onClick={copyInviteCode}
                        title="Copy Invite Code"
                        className="text-slate-400 hover:text-slate-700 p-1"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium">Super Admin Email:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {registeredAdminEmail}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium">Plan:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      1-Term Free Pilot (Awaiting Activation)
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200/80 text-[11px] text-blue-900 leading-relaxed">
                  <strong>Activation Notice:</strong> Forward your School Invite Code <strong>({registeredInviteCode})</strong> to the Founder via WhatsApp below to instantly activate full portal access for your teachers, students, and bursary office.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-1">
                <a
                  href={`https://wa.me/2349034616893?text=${encodeURIComponent(
                    `Hello Forvica Global Venture, we just registered ${registeredSchoolName} (${registeredInviteCode}) on Aegis and are awaiting access activation.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Verify via WhatsApp (+234 903 461 6893)</span>
                </a>

                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Return to Portal Sign-In Page →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Subdued Security Notice */}
          <div className="pt-4 border-t border-slate-200 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Multi-Tenant Architecture • End-to-End Isolated Data • NDPA 2023 Compliant</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right Brand & Enterprise Reliability Panel */}
      <div className="hidden md:flex md:w-1/2 bg-[#0F172A] text-white p-12 lg:p-16 flex-col justify-between">
        <div className="space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 text-xs text-slate-400 font-mono uppercase tracking-wider">
            <span>Aegis Multi-Tenant Cloud</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-snug">
            One unified operating system for your entire school community.
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed">
            From nursery early developmental milestones to senior secondary WAEC and NECO weighted broadsheets, Aegis gives your staff and bursary absolute control.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Instant Multi-Tenant Provisioning</div>
                <div className="text-[11px] text-slate-400">
                  Every school receives isolated classes, staff registries, fee ledgers, and unique invite codes.
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
                  Automated result locking until the bursar reviews bank deposit receipts and marks clearance.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Role-Based 3-Hub Access</div>
                <div className="text-[11px] text-slate-400">
                  Tailored portals for School Administrators, Subject Teachers, and Students & Parents.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
          <span>Aegis Multi-Tenant Platform</span>
          <span>Enterprise Cloud Architecture</span>
        </div>
      </div>
    </div>
  );
}
