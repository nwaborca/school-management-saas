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
  Sun,
  Moon,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { schoolInfo, currentUser, isAuthenticated, logout, theme, toggleTheme, updateAdminPassword } = useApp();
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

    if (role === 'student') {
      return [{ href: '/student-hub', label: 'My Student Hub' }];
    }

    if (role === 'teacher') {
      return [{ href: '/academic-hub', label: 'Teacher Academic Hub' }];
    }

    // Principal / Admin / Bursar - Strict RBAC Isolation (No Student View)
    return [
      { href: '/admin-hub', label: 'Admin Command Center' },
      { href: '/bursar-hub', label: 'Bursar & Fees Hub' },
      { href: '/academic-hub', label: 'Academic & Scoring' },
    ];
  })();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/95 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* School Logo & Title */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-rose-900 border border-rose-800 flex items-center justify-center text-amber-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight text-gray-900 dark:text-gray-50 flex items-center gap-1.5">
                {schoolInfo.name}
              </span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                {schoolInfo.motto}
              </p>
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-rose-900 text-amber-300 border border-rose-800'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Session & Controls */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-amber-500 dark:text-amber-400 border border-gray-300 dark:border-gray-700 transition cursor-pointer shadow-sm"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-gray-700" />
            )}
          </button>

          {isAuthenticated && currentUser ? (
            <div className="relative flex items-center gap-2.5">
              <div className="text-right">
                <div className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1 justify-end">
                  {currentUser.role === 'admin' ? (
                    <Shield className="w-3 h-3 text-amber-500" />
                  ) : (
                    <User className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>{currentUser.full_name}</span>
                </div>
                <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                  {currentUser.reg_number ? `Reg: ${currentUser.reg_number}` : `Role: ${currentUser.role.toUpperCase()}`}
                </div>
              </div>

              {/* Admin Self-Service Password Reset Trigger */}
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-amber-600 dark:text-amber-400 transition cursor-pointer border border-gray-300 dark:border-gray-700 shadow-sm"
                  title="Admin Security / Change Password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition cursor-pointer border border-gray-300 dark:border-gray-700"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 border border-rose-800 text-gray-50 text-xs font-semibold transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In</span>
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle & Theme */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-amber-500 dark:text-amber-400 border border-gray-300 dark:border-gray-700 transition"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-700" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-700"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-xs font-semibold ${
                pathname === link.href
                  ? 'bg-rose-900 text-amber-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Sign Out
            </button>
          )}
        </div>
      )}
      {/* Admin Password Security Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 relative max-h-[90vh] overflow-y-auto my-auto transition-colors duration-200">
            <button
              onClick={() => {
                setIsPasswordModalOpen(false);
                setPasswordError(null);
                setPasswordSuccess(false);
              }}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg bg-gray-100 dark:bg-gray-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">Admin Password Security</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">Self-service credential management</p>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-xs">Admin password successfully updated!</p>
                <p className="text-[11px] text-gray-600 dark:text-gray-400">Use your new credentials on future logins.</p>
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
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                    Current Password:
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current admin password"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                    New Password (min 6 characters):
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                    Confirm New Password:
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
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
