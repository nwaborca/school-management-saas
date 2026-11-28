'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { TeacherProfile } from '@/types';
import { INITIAL_CLASSES, INITIAL_SUBJECTS } from '@/lib/mockData';
import {
  UserCheck,
  Plus,
  Edit3,
  Trash2,
  X,
  Shield,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Copy,
  Check,
  Search,
  BookOpen,
  GraduationCap,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';

export default function TeacherRegistry() {
  const {
    classes = [],
    subjects = [],
    teachers = [],
    registerTeacher,
    updateTeacher,
    deleteTeacher,
  } = useApp();

  // Combine live with defaults to guarantee 33 classes & complete NERDC curriculum
  const availableClasses = useMemo(() => {
    return classes.length > 0 ? classes : INITIAL_CLASSES;
  }, [classes]);

  const availableSubjects = useMemo(() => {
    return subjects.length > 0 ? subjects : INITIAL_SUBJECTS;
  }, [subjects]);

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);
  const [newCredentialsModal, setNewCredentialsModal] = useState<{
    teacherName: string;
    teacherIdCode: string;
    username: string;
    password: string;
    isReset?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [viewingCredentialsTeacher, setViewingCredentialsTeacher] = useState<TeacherProfile | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [teacherId: string]: boolean }>({});
  const [registerStatus, setRegisterStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [freshPasswords, setFreshPasswords] = useState<{ [teacherId: string]: string }>({});

  const handleQuickResetPassword = (t: TeacherProfile) => {
    const res = updateTeacher(t.id, {
      fullName: t.full_name,
      phone: t.phone,
      email: t.email,
      role: t.role,
      resetCredentials: true,
    });

    const newPass = res.newPassword;
    if (newPass) {
      setFreshPasswords((prev) => ({
        ...prev,
        [t.id]: newPass,
      }));
      setNewCredentialsModal({
        teacherName: t.full_name,
        teacherIdCode: t.teacher_id_code,
        username: t.username,
        password: newPass,
        isReset: true,
      });
    }
  };

  const togglePasswordVisibility = (teacherId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [teacherId]: !prev[teacherId],
    }));
  };

  const copyTextToClipboard = (text: string, fieldId: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  // Register form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+234');
  const [email, setEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'teacher' | 'gate_security'>('teacher');
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [formClassId, setFormClassId] = useState('');
  const [isPartTime, setIsPartTime] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');

  // Edit form fields
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<'teacher' | 'gate_security'>('teacher');
  const [editAssignedSubjects, setEditAssignedSubjects] = useState<string[]>([]);
  const [editFormClassId, setEditFormClassId] = useState('');
  const [editIsPartTime, setEditIsPartTime] = useState(false);
  const [editSubjectSearch, setEditSubjectSearch] = useState('');
  const [resetCredentials, setResetCredentials] = useState(false);

  // Filtered NERDC subjects for search
  const filteredRegisterSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return availableSubjects;
    const q = subjectSearch.toLowerCase();
    return availableSubjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [availableSubjects, subjectSearch]);

  const filteredEditSubjects = useMemo(() => {
    if (!editSubjectSearch.trim()) return availableSubjects;
    const q = editSubjectSearch.toLowerCase();
    return availableSubjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [availableSubjects, editSubjectSearch]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    try {
      setRegisterStatus(null);
      const res = await registerTeacher({
        fullName: fullName.trim(),
        phone: phone.trim().startsWith('+234') ? phone.trim() : `+234${phone.trim()}`,
        email: email.trim(),
        role: staffRole,
        assignedSubjectIds: staffRole === 'gate_security' ? [] : assignedSubjects,
        assignedSubjects: staffRole === 'gate_security' ? [] : assignedSubjects,
        formClassId: isPartTime || staffRole === 'gate_security' ? undefined : (formClassId || undefined),
        assignedClassId: isPartTime || staffRole === 'gate_security' ? null : (formClassId || null),
        isPartTime: staffRole === 'gate_security' ? true : isPartTime,
      });

      setIsRegisterOpen(false);
      setFreshPasswords((prev) => ({
        ...prev,
        [res.teacher.id]: res.initialPassword,
      }));
      setNewCredentialsModal({
        teacherName: res.teacher.full_name,
        teacherIdCode: res.teacher.teacher_id_code,
        username: res.teacher.username,
        password: res.initialPassword,
        isReset: false,
      });

      // Reset registration form
      setFullName('');
      setPhone('+234');
      setEmail('');
      setStaffRole('teacher');
      setAssignedSubjects([]);
      setFormClassId('');
      setIsPartTime(false);
      setSubjectSearch('');
    } catch (err: any) {
      console.error('Failed to register teacher:', err);
      setRegisterStatus({
        type: 'error',
        message: err?.message || 'Could not complete registration. Please check database connectivity.',
      });
    }
  };

  const openEdit = (t: TeacherProfile) => {
    setEditingTeacher(t);
    setEditFullName(t.full_name);
    setEditPhone(t.phone);
    setEditEmail(t.email);
    setEditStaffRole(t.role === 'gate_security' ? 'gate_security' : 'teacher');
    setEditAssignedSubjects(t.assigned_subjects || t.assigned_subject_ids || []);
    setEditFormClassId(t.assigned_class_id || t.form_class_id || '');
    setEditIsPartTime(Boolean(t.is_part_time));
    setEditSubjectSearch('');
    setResetCredentials(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    const isSecurity = editStaffRole === 'gate_security';
    const res = updateTeacher(editingTeacher.id, {
      fullName: editFullName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      role: editStaffRole,
      assignedSubjectIds: isSecurity ? [] : editAssignedSubjects,
      assignedSubjects: isSecurity ? [] : editAssignedSubjects,
      formClassId: editIsPartTime || isSecurity ? undefined : (editFormClassId || undefined),
      assignedClassId: editIsPartTime || isSecurity ? null : (editFormClassId || null),
      isPartTime: isSecurity ? true : editIsPartTime,
      resetCredentials,
    });

    const teacherName = editFullName;
    const teacherIdCode = editingTeacher.teacher_id_code;
    const username = editingTeacher.username;
    const newPass = res.newPassword;

    setEditingTeacher(null);

    if (resetCredentials && newPass) {
      setFreshPasswords((prev) => ({
        ...prev,
        [editingTeacher.id]: newPass,
      }));
      setNewCredentialsModal({
        teacherName,
        teacherIdCode,
        username,
        password: newPass,
        isReset: true,
      });
    }
  };

  const toggleSubject = (subjectId: string, currentList: string[], setter: (val: string[]) => void) => {
    if (currentList.includes(subjectId)) {
      setter(currentList.filter((id) => id !== subjectId));
    } else {
      setter([...currentList, subjectId]);
    }
  };

  const copyCredentials = () => {
    if (!newCredentialsModal) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://aegis-school.vercel.app';
    const text = `AEGIS FACULTY / STAFF CREDENTIALS\nName: ${newCredentialsModal.teacherName}\nStaff ID: ${newCredentialsModal.teacherIdCode}\nLogin Username: ${newCredentialsModal.username}\nPassword: ${newCredentialsModal.password}\nPortal Link: ${origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <span>Faculty Staff Registry & Security Administration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Register teachers with automated ID generation, NERDC curriculum subject multi-allocation, 33-tier class assignment, and part-time controls.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-slate-900 font-bold text-xs flex items-center gap-2 border border-blue-600 transition cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4 text-blue-600" />
          <span>Register New Teacher</span>
        </button>
      </div>

      {/* Teachers Roster: Desktop Table (hidden md:block) & Mobile Stacked Cards (block md:hidden) */}
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Teacher ID & Name</th>
              <th className="px-4 py-3">Login Details (Staff Portal)</th>
              <th className="px-4 py-3">Contact (+234)</th>
              <th className="px-4 py-3">Form Class / Role</th>
              <th className="px-4 py-3">Assigned Subjects (NERDC)</th>
              <th className="px-4 py-3 text-center">Security Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {teachers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500 italic">
                  No staff members registered.
                </td>
              </tr>
            ) : (
              teachers.map((t) => {
                const classId = t.assigned_class_id || t.form_class_id;
                const formCls = availableClasses.find((c) => c.id === classId);
                const assignedIds = t.assigned_subjects || t.assigned_subject_ids || [];
                const assignedSubjs = availableSubjects.filter((s) => assignedIds.includes(s.id));
                const isPwVisible = Boolean(visiblePasswords[t.id]);

                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div>{t.full_name}</div>
                      <div className="text-[10px] text-blue-600 font-mono font-bold">{t.teacher_id_code}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 min-w-[210px]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 text-[10px] uppercase font-semibold">User:</span>
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-slate-800 font-bold">{t.username}</span>
                            <button
                              type="button"
                              onClick={() => copyTextToClipboard(t.username, `u-${t.id}`)}
                              className="p-1 hover:text-blue-600 text-slate-500 transition cursor-pointer"
                              title="Copy username"
                            >
                              {copiedField === `u-${t.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                          <span className="text-slate-500 text-[10px] uppercase font-semibold">Pass:</span>
                          <div className="flex items-center gap-1 font-mono">
                            {freshPasswords[t.id] ? (
                              <>
                                <span className="text-emerald-600 font-bold tracking-wider">
                                  {isPwVisible ? freshPasswords[t.id] : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(t.id)}
                                  className="p-1 hover:text-blue-600 text-slate-500 transition cursor-pointer"
                                  title={isPwVisible ? 'Hide password' : 'Show password'}
                                >
                                  {isPwVisible ? (
                                    <EyeOff className="w-3 h-3 text-blue-600" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyTextToClipboard(freshPasswords[t.id], `p-${t.id}`)}
                                  className="p-1 hover:text-blue-600 text-slate-500 transition cursor-pointer"
                                  title="Copy password"
                                >
                                  {copiedField === `p-${t.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </>
                            ) : (
                              <span className="text-slate-400 font-medium text-[10px] italic">
                                •••••••• (Encrypted)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => setViewingCredentialsTeacher(t)}
                            className="flex-1 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 border border-slate-200 transition cursor-pointer"
                          >
                            <KeyRound className="w-3 h-3 text-blue-600" />
                            <span>Slip</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickResetPassword(t)}
                            className="py-1 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] flex items-center justify-center gap-1 border border-amber-200 transition cursor-pointer"
                            title="Reset & generate fresh credentials"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            <span>Reset</span>
                          </button>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-mono">{t.phone}</div>
                      <div className="text-[10px] text-slate-500">{t.email}</div>
                    </td>

                    <td className="px-4 py-3">
                      {t.role === 'gate_security' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 w-fit">
                          <Shield className="w-3 h-3 text-indigo-600" />
                          <span>Gate Security</span>
                        </span>
                      ) : t.is_part_time ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800">
                          Part-Time (No Form Class)
                        </span>
                      ) : formCls ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-amber-300 border border-slate-200">
                          {formCls.name}
                        </span>
                      ) : (
                        <span className="text-slate-9000 italic text-[11px]">Subject Teacher</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {assignedSubjs.length > 0 ? (
                          assignedSubjs.map((s) => (
                            <span
                              key={s.id}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-50 border border-slate-200 text-slate-700"
                              title={s.name}
                            >
                              {s.code || s.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-9000 italic text-[10px]">No subjects assigned</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          t.status === 'active'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950/60 text-rose-400 border border-blue-600'
                        }`}
                      >
                        {t.status === 'active' ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                        <span>{t.status}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(t)}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-blue-600 font-bold text-[11px] border border-slate-200 transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${t.full_name}?`)) {
                              deleteTeacher(t.id);
                            }
                          }}
                          className="p-1 rounded-lg bg-slate-50 hover:bg-blue-600/50 text-rose-400 border border-slate-200 hover:border-blue-600 transition cursor-pointer"
                          title="Delete staff"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="block md:hidden space-y-3">
        {teachers.length === 0 ? (
          <div className="p-6 text-center text-slate-500 italic bg-white rounded-xl border border-slate-200 text-xs">
            No staff members registered.
          </div>
        ) : (
          teachers.map((t) => {
            const classId = t.assigned_class_id || t.form_class_id;
            const formCls = availableClasses.find((c) => c.id === classId);
            const assignedIds = t.assigned_subjects || t.assigned_subject_ids || [];
            const assignedSubjs = availableSubjects.filter((s) => assignedIds.includes(s.id));

            return (
              <div
                key={t.id}
                className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{t.full_name}</h4>
                    <span className="text-[10px] text-blue-600 font-mono font-bold">{t.teacher_id_code}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.status === 'active'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950/60 text-rose-400 border border-blue-600'
                    }`}
                  >
                    {t.status === 'active' ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                    <span>{t.status}</span>
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Username:</span>
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-slate-900 font-bold">{t.username}</span>
                      <button
                        type="button"
                        onClick={() => copyTextToClipboard(t.username, `mob-u-${t.id}`)}
                        className="p-1 hover:text-blue-600 text-slate-500 transition"
                      >
                        {copiedField === `mob-u-${t.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Password:</span>
                    <div className="flex items-center gap-1 font-mono">
                      {freshPasswords[t.id] ? (
                        <>
                          <span className="text-emerald-600 font-bold text-xs tracking-wider">
                            {Boolean(visiblePasswords[t.id]) ? freshPasswords[t.id] : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(t.id)}
                            className="p-1 hover:text-blue-600 text-slate-500 transition cursor-pointer"
                          >
                            {Boolean(visiblePasswords[t.id]) ? (
                              <EyeOff className="w-3 h-3 text-blue-600" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyTextToClipboard(freshPasswords[t.id], `mob-p-${t.id}`)}
                            className="p-1 hover:text-blue-600 text-slate-500 transition cursor-pointer"
                          >
                            {copiedField === `mob-p-${t.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400 font-medium text-[10px] italic">
                          •••••••• (Encrypted)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewingCredentialsTeacher(t)}
                      className="flex-1 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 border border-slate-200 transition"
                    >
                      <KeyRound className="w-3 h-3 text-blue-600" />
                      <span>View Full Credential Slip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickResetPassword(t)}
                      className="py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] flex items-center justify-center gap-1 border border-amber-200 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-600" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-1 border-t border-slate-200/60">
                  <div>
                    <div className="text-[10px] text-slate-500">Contact</div>
                    <div className="font-mono text-[11px]">{t.phone}</div>
                    <div className="text-[10px] text-slate-500 truncate">{t.email}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Class Role</div>
                    {t.role === 'gate_security' ? (
                      <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Shield className="w-3 h-3 text-indigo-600" />
                        <span>Gate Security</span>
                      </span>
                    ) : t.is_part_time ? (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800">
                        Part-Time
                      </span>
                    ) : formCls ? (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-amber-300 border border-slate-200">
                        {formCls.name}
                      </span>
                    ) : (
                      <span className="text-slate-9000 italic text-[11px]">Subject Teacher</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <div className="text-[10px] text-slate-500 mb-1">Assigned Subjects ({assignedSubjs.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {assignedSubjs.length > 0 ? (
                      assignedSubjs.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-50 border border-slate-200 text-slate-700"
                        >
                          {s.code || s.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-9000 italic text-[10px]">No subjects assigned</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                  <button
                    onClick={() => openEdit(t)}
                    className="flex-1 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-blue-600 font-bold text-xs border border-slate-200 transition"
                  >
                    Edit / Reset
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${t.full_name}?`)) {
                        deleteTeacher(t.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-blue-600/50 text-rose-400 border border-slate-200 hover:border-blue-600 transition"
                    title="Delete staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Register Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 text-slate-900 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsRegisterOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 rounded-lg bg-slate-100 border border-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <span>Register New Teacher</span>
            </h3>

            {registerStatus && (
              <div
                className={`p-3 rounded-xl text-xs mb-3 flex items-center gap-2 ${
                  registerStatus.type === 'error'
                    ? 'bg-rose-950/80 border border-blue-600 text-rose-300'
                    : 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                }`}
              >
                <span>{registerStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ngozi Okafor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (+234):</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email:</label>
                  <input
                    type="email"
                    required
                    placeholder="teacher@apexacademy.sch.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Staff Role Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Designation / Role:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffRole('teacher')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      staffRole === 'teacher'
                        ? 'bg-blue-50 text-blue-700 border-blue-400 font-bold'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    <span>Academic Teacher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffRole('gate_security');
                      setIsPartTime(true);
                      setFormClassId('');
                      setAssignedSubjects([]);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      staffRole === 'gate_security'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-400 font-bold'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <span>Gate Security (Gateman)</span>
                  </button>
                </div>
                {staffRole === 'gate_security' && (
                  <p className="text-[11px] text-indigo-700 bg-indigo-50/70 border border-indigo-200 rounded-lg p-2 mt-2">
                    🛡️ <strong>Non-Teaching Staff:</strong> Automatically provisions Security ID (<code>SEC-...</code>) and grants dedicated access strictly to the <strong>Mobile Gate Dismissal Checkpoint</strong> (blocks academic, finance, and administrative data).
                  </p>
                )}
              </div>

              {staffRole === 'teacher' && (
                <>
                  {/* Part-Time Teacher Toggle Switch */}
                  <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>Part-Time Teacher</span>
                        {isPartTime && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isPartTime
                          ? 'Part-time faculty: Class assignment disabled (no fixed form class).'
                          : 'Full-time faculty: Can be assigned as a Form Class Teacher.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPartTime}
                      onClick={() => {
                        const nextVal = !isPartTime;
                        setIsPartTime(nextVal);
                        if (nextVal) {
                          setFormClassId('');
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isPartTime ? 'bg-amber-600' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isPartTime ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Class Assignment Dropdown (33-tier Nigerian Hierarchy) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                        <span>What class will they be assigned to? (Creche to SS3 Arm F):</span>
                      </span>
                      {isPartTime && (
                        <span className="text-[10px] text-blue-600 italic">Disabled for Part-Time</span>
                      )}
                    </label>
                    <select
                      value={formClassId}
                      disabled={isPartTime}
                      onChange={(e) => setFormClassId(e.target.value)}
                      className={`w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition ${
                        isPartTime
                          ? 'opacity-40 cursor-not-allowed border-slate-200 bg-gray-950/70 text-slate-9000'
                          : 'border-slate-200 cursor-pointer'
                      }`}
                    >
                      <option value="">
                        {isPartTime
                          ? '-- Class Assignment Disabled (Part-Time Teacher) --'
                          : '-- None (Subject Teacher Only) --'}
                      </option>
                      {!isPartTime &&
                        availableClasses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.level || c.stage})
                          </option>
                        ))}
                    </select>
                    {isPartTime && (
                      <p className="text-[10px] text-blue-600/80 mt-1 italic">
                        Part-time teachers do not manage a fixed form class. They teach their assigned subject(s) across classes.
                      </p>
                    )}
                  </div>
                </>
              )}

              {staffRole === 'teacher' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>What subject(s) will the teacher be teaching? (NERDC Curriculum):</span>
                    </span>
                    <span className="text-[11px] font-mono text-blue-600">
                      {assignedSubjects.length} selected
                    </span>
                  </label>

                  {/* Selected subjects tags */}
                  {assignedSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/60 rounded-xl border border-slate-200 max-h-24 overflow-y-auto">
                      {assignedSubjects.map((subId) => {
                        const subj = availableSubjects.find((s) => s.id === subId);
                        return (
                          <span
                            key={subId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-semibold"
                          >
                            <span>{subj ? `${subj.name} (${subj.code})` : subId}</span>
                            <button
                              type="button"
                              onClick={() =>
                                toggleSubject(subId, assignedSubjects, setAssignedSubjects)
                              }
                              className="hover:text-slate-900 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Search Bar for Subjects */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search NERDC subjects (e.g. Mathematics, Biology, English)..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                  </div>

                  {/* Scrollable multi-select subject list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-2 bg-slate-50/40 border border-slate-200 rounded-xl">
                    {filteredRegisterSubjects.map((subj) => {
                      const isSelected = assignedSubjects.includes(subj.id);
                      return (
                        <button
                          type="button"
                          key={subj.id}
                          onClick={() =>
                            toggleSubject(subj.id, assignedSubjects, setAssignedSubjects)
                          }
                          className={`text-left p-2 rounded-lg border text-xs flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/30 border-rose-700 text-slate-900 font-bold'
                              : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="truncate text-[11px]">{subj.name}</div>
                            <div className="text-[9px] text-slate-9000 font-mono">
                              {subj.code} • {subj.category || 'General'}
                            </div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? 'bg-amber-500 border-amber-500 text-gray-950 font-bold'
                                : 'border-slate-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-blue-600 transition cursor-pointer shadow-md mt-2"
              >
                <span>{staffRole === 'gate_security' ? 'Save Security Guard & Generate Gate Pass Key' : 'Save Teacher & Generate Credentials'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 text-slate-900 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingTeacher(null)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 rounded-lg bg-slate-100 border border-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              <span>Update Faculty Staff Member</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">{editingTeacher.teacher_id_code}</p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (+234):</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email:</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Staff Designation in Edit Form */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Designation / Role:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStaffRole('teacher')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      editStaffRole === 'teacher'
                        ? 'bg-blue-50 text-blue-700 border-blue-400 font-bold'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    <span>Academic Teacher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditStaffRole('gate_security');
                      setEditIsPartTime(true);
                      setEditFormClassId('');
                      setEditAssignedSubjects([]);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      editStaffRole === 'gate_security'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-400 font-bold'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <span>Gate Security (Gateman)</span>
                  </button>
                </div>
              </div>

              {editStaffRole === 'teacher' && (
                <>
                  {/* Part-Time Toggle Switch */}
                  <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>Part-Time Teacher</span>
                        {editIsPartTime && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {editIsPartTime
                          ? 'Part-time faculty: Class assignment disabled (no fixed form class).'
                          : 'Full-time faculty: Can be assigned as a Form Class Teacher.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={editIsPartTime}
                      onClick={() => {
                        const nextVal = !editIsPartTime;
                        setEditIsPartTime(nextVal);
                        if (nextVal) {
                          setEditFormClassId('');
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        editIsPartTime ? 'bg-amber-600' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          editIsPartTime ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Class Assignment Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                        <span>What class will they be assigned to? (33-tier Hierarchy):</span>
                      </span>
                      {editIsPartTime && (
                        <span className="text-[10px] text-blue-600 italic">Disabled for Part-Time</span>
                      )}
                    </label>
                    <select
                      value={editFormClassId}
                      disabled={editIsPartTime}
                      onChange={(e) => setEditFormClassId(e.target.value)}
                      className={`w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition ${
                        editIsPartTime
                          ? 'opacity-40 cursor-not-allowed border-slate-200 bg-gray-950/70 text-slate-9000'
                          : 'border-slate-200 cursor-pointer'
                      }`}
                    >
                      <option value="">
                        {editIsPartTime
                          ? '-- Class Assignment Disabled (Part-Time Teacher) --'
                          : '-- None (Subject Teacher Only) --'}
                      </option>
                      {!editIsPartTime &&
                        availableClasses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.level || c.stage})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* NERDC Subjects Multi-Select */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>Assigned Subjects (NERDC Curriculum):</span>
                      </span>
                      <span className="text-[11px] font-mono text-blue-600">
                        {editAssignedSubjects.length} selected
                      </span>
                    </label>

                    {editAssignedSubjects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/60 rounded-xl border border-slate-200 max-h-24 overflow-y-auto">
                        {editAssignedSubjects.map((subId) => {
                          const subj = availableSubjects.find((s) => s.id === subId);
                          return (
                            <span
                              key={subId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-semibold"
                            >
                              <span>{subj ? `${subj.name} (${subj.code})` : subId}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleSubject(subId, editAssignedSubjects, setEditAssignedSubjects)
                                }
                                className="hover:text-slate-900 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search NERDC subjects..."
                        value={editSubjectSearch}
                        onChange={(e) => setEditSubjectSearch(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50/40 border border-slate-200 rounded-xl">
                      {filteredEditSubjects.map((subj) => {
                        const isSelected = editAssignedSubjects.includes(subj.id);
                        return (
                          <button
                            type="button"
                            key={subj.id}
                            onClick={() =>
                              toggleSubject(subj.id, editAssignedSubjects, setEditAssignedSubjects)
                            }
                            className={`text-left p-2 rounded-lg border text-xs flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600/30 border-rose-700 text-slate-900 font-bold'
                                : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-white'
                            }`}
                          >
                            <div className="truncate mr-2">
                              <div className="truncate text-[11px]">{subj.name}</div>
                              <div className="text-[9px] text-slate-9000 font-mono">
                                {subj.code} • {subj.category || 'General'}
                              </div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                isSelected
                                  ? 'bg-amber-500 border-amber-500 text-gray-950 font-bold'
                                  : 'border-slate-200'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Password Reset Option */}
              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center gap-3">
                <input
                  type="checkbox"
                  id="resetCredentials"
                  checked={resetCredentials}
                  onChange={(e) => setResetCredentials(e.target.checked)}
                  className="rounded border-slate-200 text-blue-600 focus:ring-blue-600 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="resetCredentials" className="text-xs text-slate-700 cursor-pointer">
                  Revoke & Regenerate Credentials (Generates a new secure password)
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 border border-blue-600 transition cursor-pointer shadow-md"
              >
                <span>Save Staff Updates</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Direct Staff Credentials Review Modal */}
      {viewingCredentialsTeacher && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setViewingCredentialsTeacher(null)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 rounded-lg bg-slate-100 border border-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-slate-50 text-blue-600 border border-slate-200">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Staff Login Dossier</h3>
                <p className="text-xs text-slate-500">Official authentication details for staff access.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs space-y-3 text-slate-700">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans text-[11px]">Staff Name:</span>
                <strong className="text-slate-900 text-xs font-semibold">{viewingCredentialsTeacher.full_name}</strong>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans text-[11px]">Staff / Teacher ID:</span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-blue-600">{viewingCredentialsTeacher.teacher_id_code}</strong>
                  <button
                    type="button"
                    onClick={() => copyTextToClipboard(viewingCredentialsTeacher.teacher_id_code, 'dossier-id')}
                    className="p-1 hover:text-blue-600 text-slate-500 transition"
                  >
                    {copiedField === 'dossier-id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans text-[11px]">Portal Username:</span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-slate-900">{viewingCredentialsTeacher.username}</strong>
                  <button
                    type="button"
                    onClick={() => copyTextToClipboard(viewingCredentialsTeacher.username, 'dossier-user')}
                    className="p-1 hover:text-blue-600 text-slate-500 transition"
                  >
                    {copiedField === 'dossier-user' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-sans text-[11px]">Access Password:</span>
                <div className="flex items-center gap-1.5">
                  {freshPasswords[viewingCredentialsTeacher.id] ? (
                    <>
                      <strong className="text-emerald-600 text-sm font-bold tracking-wider">
                        {Boolean(visiblePasswords[viewingCredentialsTeacher.id])
                          ? freshPasswords[viewingCredentialsTeacher.id]
                          : '••••••••'}
                      </strong>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(viewingCredentialsTeacher.id)}
                        className="p-1 hover:text-blue-600 text-slate-500 transition cursor-pointer"
                        title={Boolean(visiblePasswords[viewingCredentialsTeacher.id]) ? 'Hide password' : 'Show password'}
                      >
                        {Boolean(visiblePasswords[viewingCredentialsTeacher.id]) ? (
                          <EyeOff className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyTextToClipboard(freshPasswords[viewingCredentialsTeacher.id], 'dossier-pass')}
                        className="p-1 hover:text-blue-600 text-slate-500 transition cursor-pointer"
                      >
                        {copiedField === 'dossier-pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  ) : (
                    <span className="text-slate-500 font-mono text-xs italic">
                      •••••••• (Encrypted)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!freshPasswords[viewingCredentialsTeacher.id] ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800">Password is encrypted</div>
                  <div className="text-[11px] text-slate-500">Generate a fresh temporary password for this staff member.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const teacher = viewingCredentialsTeacher;
                    handleQuickResetPassword(teacher);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset & Show New Password</span>
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  New credentials generated. Provide this password to <strong>{viewingCredentialsTeacher.full_name}</strong> to access the Academic Hub.
                </span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Staff can log in to the Academic Hub using either their <strong>Teacher ID</strong> (<code>{viewingCredentialsTeacher.teacher_id_code}</code>) or <strong>Username</strong> with their access password.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const passDisplay = freshPasswords[viewingCredentialsTeacher.id] || '[Protected by Encryption — Reset to generate new password]';
                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                  const summary = `Staff Credentials Slip:\nName: ${viewingCredentialsTeacher.full_name}\nStaff ID: ${viewingCredentialsTeacher.teacher_id_code}\nUsername: ${viewingCredentialsTeacher.username}\nPassword: ${passDisplay}\nLogin URL: ${origin}/login`;
                  copyTextToClipboard(summary, 'dossier-all');
                }}
                className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-blue-600 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedField === 'dossier-all' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedField === 'dossier-all' ? 'Copied Slip!' : 'Copy Full Slip'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingCredentialsTeacher(null)}
                className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-slate-900 border border-blue-600 font-bold text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copyable Credentials Popup */}
      {newCredentialsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-slate-50 text-blue-600 border border-slate-200">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {newCredentialsModal.isReset ? 'Credentials Revoked & Reset' : 'Teacher Registered Successfully'}
                </h3>
                <p className="text-xs text-slate-500">Secure staff login credentials generated.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs space-y-2 text-slate-700">
              <div>Staff: <strong className="text-slate-900 font-semibold">{newCredentialsModal.teacherName}</strong></div>
              <div>Teacher ID: <strong className="text-blue-600">{newCredentialsModal.teacherIdCode}</strong></div>
              <div>Username: <strong className="text-slate-900">{newCredentialsModal.username}</strong></div>
              <div>Password: <strong className="text-rose-300">{newCredentialsModal.password}</strong></div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={copyCredentials}
                className="py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-blue-600 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Info'}</span>
              </button>

              <button
                type="button"
                onClick={() => setNewCredentialsModal(null)}
                className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-slate-900 border border-blue-600 font-bold text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
