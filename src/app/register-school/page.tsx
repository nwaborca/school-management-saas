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

  // Success state with new School Invite Code
  const [registeredInviteCode, setRegisteredInviteCode] = useState<string | null>(null);
  const [registeredSchoolName, setRegisteredSchoolName] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

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
            /* Post-Registration Onboarding Card */
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                  School Registered Successfully!
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>{registeredSchoolName}</strong> has been provisioned with all 33 class tiers (Creche to SS3 Arm F) and continuous assessment modules.
                </p>
              </div>

              {/* Shareable Invite Code Display Card */}
              <div className="p-5 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Your Official School Invite Code
                </div>
                <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg">
                  <span className="text-2xl font-mono font-extrabold text-[#0F172A] tracking-widest">
                    {registeredInviteCode}
                  </span>
                  <button
                    onClick={copyInviteCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer border border-slate-300"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Share this code with your teachers, parents, and students. They can enter this code on the login page to access your school’s dedicated hub.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => router.push('/admin-hub')}
                  className="w-full py-3 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <span>Launch Admin Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
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
