'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  GraduationCap,
  LogOut,
  LogIn,
  User,
  Shield,
  Menu,
  X,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Building2,
  PlusCircle,
  Receipt,
  DollarSign,
  UserCheck,
  UserPlus,
  Send,
  QrCode,
  FileText,
  CreditCard,
  ShieldCheck,
  Award,
  Users,
  CheckSquare,
  FileSpreadsheet,
} from 'lucide-react';
import { SchoolLogo } from '@/components/SchoolLogo';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { schoolInfo, currentSchool, currentUser, isAuthenticated, logout, updateAdminPassword, classes = [], teachers = [] } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Admin Self-Service Password Reset Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const role = currentUser?.role;

  // Strict role-based navigation links
  const navLinks = (() => {
    if (!isAuthenticated || !role) {
      return [
        { href: '/', label: 'Home' },
        { href: '/login', label: 'Login' },
      ];
    }

    if (role === 'gate_security') {
      return [{ href: '/gate', label: 'Gate Security Checkpoint' }];
    }

    if (role === 'student') {
      return [{ href: '/student-hub', label: 'My Student Hub' }];
    }

    if (role === 'teacher') {
      return [{ href: '/academic-hub', label: 'Teacher Academic Hub' }];
    }

    // Principal / Admin / Bursar - Strict RBAC Isolation: Only Admin Command Center and Bursar & Fees Hub
    return [
      { href: '/admin-hub', label: 'Admin Command Center' },
      { href: '/bursar-hub', label: 'Bursar & Fees Hub' },
    ];
  })();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* School Logo & Title */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <SchoolLogo
              logoUrl={currentSchool?.logo_url || currentSchool?.logoUrl}
              name={currentSchool?.name || schoolInfo.name}
              className="h-10 w-10 object-contain shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-[#0F172A]">
                  {currentSchool?.name || schoolInfo.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {schoolInfo.motto}
              </p>
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  isActive
                    ? 'bg-slate-100 text-[#0F172A] font-bold border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Session & Controls */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated && currentUser ? (
            <div className="relative flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1 justify-end">
                  {currentUser.role === 'admin' ? (
                    <Shield className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>{currentUser.full_name}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {currentUser.reg_number ? `Reg: ${currentUser.reg_number}` : `Role: ${currentUser.role.toUpperCase()}`}
                </div>
              </div>

              {/* Admin Self-Service Password Reset Trigger */}
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer border border-slate-200 shadow-xs"
                  title="Admin Security / Change Password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer border border-slate-200 shadow-xs"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/register-school"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer border border-slate-200"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Register School</span>
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-3 space-y-3 shadow-md">
          {isAuthenticated && currentUser && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  {currentUser.role === 'admin' ? (
                    <Shield className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>{currentUser.full_name}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  {currentUser.reg_number ? `Reg: ${currentUser.reg_number}` : `Role: ${currentUser.role.toUpperCase()}`}
                </div>
              </div>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsPasswordModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700"
                  title="Change Password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                  pathname === link.href
                    ? 'bg-slate-100 text-[#0F172A] font-bold border border-slate-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Admin Command Center Quick Sections (Mobile Drawer) */}
          {isAuthenticated && currentUser?.role === 'admin' && (
            <div className="pt-2 border-t border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3.5 py-1">
                Admin Command Sections
              </div>
              {[
                { tab: 'roster', label: 'Student Roster', icon: GraduationCap },
                { tab: 'receipts', label: 'Receipt Verification', icon: Receipt },
                { tab: 'ledger', label: 'Historical Debt', icon: DollarSign },
                { tab: 'teachers', label: 'Teacher Registry', icon: UserCheck },
                { tab: 'enroll', label: 'Dual Enrollment', icon: UserPlus },
                { tab: 'notices', label: 'Announcements', icon: Send },
                { tab: 'attendance', label: 'Staff Attendance', icon: QrCode },
                { tab: 'pickup-log', label: 'Safe Pick-Up Audit', icon: Shield },
                { tab: 'admin-security', label: 'Security & Password', icon: KeyRound },
              ].map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (pathname !== '/admin-hub' && pathname !== '/admin') {
                        router.push('/admin-hub');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('aegis-admin-tab-switch', { detail: { tab: item.tab } }));
                        }, 300);
                      } else {
                        window.dispatchEvent(new CustomEvent('aegis-admin-tab-switch', { detail: { tab: item.tab } }));
                      }
                    }}
                    className="w-full text-left px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <IconComponent className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Student Hub Sections (Mobile Drawer) */}
          {isAuthenticated && currentUser?.role === 'student' && (
            <div className="pt-2 border-t border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3.5 py-1">
                Student Hub Sections
              </div>
              {[
                { tab: 'results', label: 'Term Result Sheet', icon: FileText },
                { tab: 'fees', label: 'School Fees & Bank Transfer Hub', icon: CreditCard },
                { tab: 'pickup', label: 'Safe Pick-Up & Dismissal Pass', icon: ShieldCheck },
                { tab: 'awards', label: '3D Academic Trophy', icon: Award },
              ].map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (pathname !== '/student-hub' && pathname !== '/student') {
                        router.push('/student-hub');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('aegis-student-tab-switch', { detail: { tab: item.tab } }));
                        }, 300);
                      } else {
                        window.dispatchEvent(new CustomEvent('aegis-student-tab-switch', { detail: { tab: item.tab } }));
                      }
                    }}
                    className="w-full text-left px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <IconComponent className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Teacher Academic Hub Sections (Mobile Drawer) */}
          {isAuthenticated && currentUser?.role === 'teacher' && (() => {
            const loggedTeacher =
              teachers.find((t) => t.id === currentUser?.teacher_id || t.username === currentUser?.username) || null;
            const formClassId = loggedTeacher?.is_part_time
              ? undefined
              : (loggedTeacher?.assigned_class_id || loggedTeacher?.form_class_id || currentUser?.assigned_class_id || currentUser?.form_class_id);
            const formClass = formClassId ? classes.find((c) => c.id === formClassId) : null;
            const broadsheetClassName = formClass?.name || currentUser?.form_class_name;
            const broadsheetLabel = broadsheetClassName
              ? `Form Class Broadsheet (${broadsheetClassName})`
              : 'Form Class Broadsheet';

            return (
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3.5 py-1">
                  Teacher Hub Sections
                </div>
                {[
                  { tab: 'entry', label: 'Subject Score Entry Grid', icon: CheckSquare },
                  { tab: 'broadsheet', label: broadsheetLabel, icon: FileSpreadsheet },
                  { tab: 'pickup_gate', label: 'Safe Pick-Up Gate Scanner', icon: ShieldCheck },
                  { tab: 'dismissal', label: 'Class Dismissal & Safe Pick-Up', icon: Users },
                  { tab: 'enroll_student', label: 'Form Teacher Dual Enrollment', icon: UserPlus },
                ].map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (pathname !== '/academic-hub' && pathname !== '/academic' && pathname !== '/teacher') {
                          router.push('/academic-hub');
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('aegis-teacher-tab-switch', { detail: { tab: item.tab } }));
                          }, 300);
                        } else {
                          window.dispatchEvent(new CustomEvent('aegis-teacher-tab-switch', { detail: { tab: item.tab } }));
                        }
                      }}
                      className="w-full text-left px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <IconComponent className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          <div className="pt-2 border-t border-slate-200">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F172A] text-white hover:bg-slate-800 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      )}
      {/* Admin Password Security Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-md w-full bg-white  rounded-xl p-6 shadow-2xl border border-gray-200  text-gray-900  relative max-h-[90vh] overflow-y-auto my-auto transition-colors duration-200">
            <button
              onClick={() => {
                setIsPasswordModalOpen(false);
                setPasswordError(null);
                setPasswordSuccess(false);
              }}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-900  :text-white rounded-lg bg-gray-100  cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600  border border-amber-500/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 ">Admin Password Security</h3>
                <p className="text-xs text-gray-500  font-mono">Self-service credential management</p>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50  border border-rose-200  text-rose-700  text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 " />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50  border border-emerald-200  text-emerald-800  text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-xs">Admin password successfully updated!</p>
                <p className="text-[11px] text-gray-600 ">Use your new credentials on future logins.</p>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="mt-3 px-4 py-2 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPasswordError(null);
                  if (newPassword !== confirmPassword) {
                    setPasswordError('New password and confirmation do not match.');
                    return;
                  }
                  const res = updateAdminPassword(currentPassword, newPassword);
                  if (res.success) {
                    setPasswordSuccess(true);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  } else {
                    setPasswordError(res.message || 'Failed to update admin password.');
                  }
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-gray-700  font-semibold mb-1">
                    Current Password:
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current admin password"
                    className="w-full bg-white  border border-gray-300  rounded-xl px-3.5 py-2.5 text-xs text-gray-900  focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700  font-semibold mb-1">
                    New Password (min 6 characters):
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-white  border border-gray-300  rounded-xl px-3.5 py-2.5 text-xs text-gray-900  focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700  font-semibold mb-1">
                    Confirm New Password:
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-white  border border-gray-300  rounded-xl px-3.5 py-2.5 text-xs text-gray-900  focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-2 border border-rose-800 transition cursor-pointer shadow-md"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Update My Password</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
