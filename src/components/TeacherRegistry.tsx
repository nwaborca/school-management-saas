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
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Copy,
  Check,
  Search,
  BookOpen,
  GraduationCap,
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
  const [registerStatus, setRegisterStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Register form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+234');
  const [email, setEmail] = useState('');
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [formClassId, setFormClassId] = useState('');
  const [isPartTime, setIsPartTime] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');

  // Edit form fields
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
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
      const res = registerTeacher({
        fullName: fullName.trim(),
        phone: phone.trim().startsWith('+234') ? phone.trim() : `+234${phone.trim()}`,
        email: email.trim(),
        assignedSubjectIds: assignedSubjects,
        assignedSubjects: assignedSubjects,
        formClassId: isPartTime ? undefined : (formClassId || undefined),
        assignedClassId: isPartTime ? null : (formClassId || null),
        isPartTime,
      });

      setIsRegisterOpen(false);
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
    setEditAssignedSubjects(t.assigned_subjects || t.assigned_subject_ids || []);
    setEditFormClassId(t.assigned_class_id || t.form_class_id || '');
    setEditIsPartTime(Boolean(t.is_part_time));
    setEditSubjectSearch('');
    setResetCredentials(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    const res = updateTeacher(editingTeacher.id, {
      fullName: editFullName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      assignedSubjectIds: editAssignedSubjects,
      assignedSubjects: editAssignedSubjects,
      formClassId: editIsPartTime ? undefined : (editFormClassId || undefined),
      assignedClassId: editIsPartTime ? null : (editFormClassId || null),
      isPartTime: editIsPartTime,
      resetCredentials,
    });

    const teacherName = editFullName;
    const teacherIdCode = editingTeacher.teacher_id_code;
    const username = editingTeacher.username;
    const newPass = res.newPassword;

    setEditingTeacher(null);

    if (resetCredentials && newPass) {
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
    const text = `APEX ACADEMY FACULTY CREDENTIALS\nName: ${newCredentialsModal.teacherName}\nTeacher ID: ${newCredentialsModal.teacherIdCode}\nLogin Username: ${newCredentialsModal.username}\nPassword: ${newCredentialsModal.password}\nPortal Link: http://localhost:3000/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gray-800 border border-gray-700">
        <div>
          <h2 className="text-base font-bold text-gray-50 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-500" />
            <span>Faculty Staff Registry & Security Administration</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Register teachers with automated ID generation, NERDC curriculum subject multi-allocation, 33-tier class assignment, and part-time controls.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center gap-2 border border-rose-800 transition cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Register New Teacher</span>
        </button>
      </div>

      {/* Teachers Roster: Desktop Table (hidden md:block) & Mobile Stacked Cards (block md:hidden) */}
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-700 bg-gray-800">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider text-[11px] border-b border-gray-700">
            <tr>
              <th className="px-4 py-3">Teacher ID & Name</th>
              <th className="px-4 py-3">Contact (+234)</th>
              <th className="px-4 py-3">Form Class / Role</th>
              <th className="px-4 py-3">Assigned Subjects (NERDC)</th>
              <th className="px-4 py-3 text-center">Security Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {teachers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400 italic">
                  No staff members registered.
                </td>
              </tr>
            ) : (
              teachers.map((t) => {
                const classId = t.assigned_class_id || t.form_class_id;
                const formCls = availableClasses.find((c) => c.id === classId);
                const assignedIds = t.assigned_subjects || t.assigned_subject_ids || [];
                const assignedSubjs = availableSubjects.filter((s) => assignedIds.includes(s.id));

                return (
                  <tr key={t.id} className="hover:bg-gray-750 transition">
                    <td className="px-4 py-3 font-semibold text-gray-100">
                      <div>{t.full_name}</div>
                      <div className="text-[10px] text-amber-400 font-mono font-bold">{t.teacher_id_code}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-gray-200 font-mono">{t.phone}</div>
                      <div className="text-[10px] text-gray-400">{t.email}</div>
                    </td>

                    <td className="px-4 py-3">
                      {t.is_part_time ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800">
                          Part-Time (No Form Class)
                        </span>
                      ) : formCls ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-900 text-amber-300 border border-gray-700">
                          {formCls.name}
                        </span>
                      ) : (
                        <span className="text-gray-500 italic text-[11px]">Subject Teacher</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {assignedSubjs.length > 0 ? (
                          assignedSubjs.map((s) => (
                            <span
                              key={s.id}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-gray-900 border border-gray-700 text-gray-300"
                              title={s.name}
                            >
                              {s.code || s.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 italic text-[10px]">No subjects assigned</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          t.status === 'active'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800'
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
                          className="px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-gray-700 text-amber-400 font-bold text-[11px] border border-gray-700 transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${t.full_name}?`)) {
                              deleteTeacher(t.id);
                            }
                          }}
                          className="p-1 rounded-lg bg-gray-900 hover:bg-rose-900/50 text-rose-400 border border-gray-700 hover:border-rose-800 transition cursor-pointer"
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
          <div className="p-6 text-center text-gray-400 italic bg-gray-800 rounded-2xl border border-gray-700 text-xs">
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
                className="p-4 bg-gray-800 rounded-2xl border border-gray-700 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-gray-100 text-sm">{t.full_name}</h4>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">{t.teacher_id_code}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.status === 'active'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950/60 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {t.status === 'active' ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                    <span>{t.status}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 pt-1 border-t border-gray-700/60">
                  <div>
                    <div className="text-[10px] text-gray-400">Contact</div>
                    <div className="font-mono text-[11px]">{t.phone}</div>
                    <div className="text-[10px] text-gray-400 truncate">{t.email}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">Class Role</div>
                    {t.is_part_time ? (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800">
                        Part-Time
                      </span>
                    ) : formCls ? (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-900 text-amber-300 border border-gray-700">
                        {formCls.name}
                      </span>
                    ) : (
                      <span className="text-gray-500 italic text-[11px]">Subject Teacher</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-700/60">
                  <div className="text-[10px] text-gray-400 mb-1">Assigned Subjects ({assignedSubjs.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {assignedSubjs.length > 0 ? (
                      assignedSubjs.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded text-[10px] bg-gray-900 border border-gray-700 text-gray-300"
                        >
                          {s.code || s.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">No subjects assigned</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/60">
                  <button
                    onClick={() => openEdit(t)}
                    className="flex-1 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-700 text-amber-400 font-bold text-xs border border-gray-700 transition"
                  >
                    Edit / Reset
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${t.full_name}?`)) {
                        deleteTeacher(t.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-gray-900 hover:bg-rose-900/50 text-rose-400 border border-gray-700 hover:border-rose-800 transition"
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-xl w-full p-6 text-gray-100 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsRegisterOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg bg-gray-900 border border-gray-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-gray-50 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-500" />
              <span>Register New Teacher</span>
            </h3>

            {registerStatus && (
              <div
                className={`p-3 rounded-xl text-xs mb-3 flex items-center gap-2 ${
                  registerStatus.type === 'error'
                    ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
                    : 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                }`}
              >
                <span>{registerStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ngozi Okafor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Phone (+234):</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Email:</label>
                  <input
                    type="email"
                    required
                    placeholder="teacher@apexacademy.sch.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Part-Time Teacher Toggle Switch */}
              <div className="p-3.5 bg-gray-900/90 border border-gray-700 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                    <span>Part-Time Teacher</span>
                    {isPartTime && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
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
                <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                    <span>What class will they be assigned to? (Creche to SS3 Arm F):</span>
                  </span>
                  {isPartTime && (
                    <span className="text-[10px] text-amber-400 italic">Disabled for Part-Time</span>
                  )}
                </label>
                <select
                  value={formClassId}
                  disabled={isPartTime}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className={`w-full bg-gray-900 border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition ${
                    isPartTime
                      ? 'opacity-40 cursor-not-allowed border-gray-800 bg-gray-950/70 text-gray-500'
                      : 'border-gray-700 cursor-pointer'
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
                  <p className="text-[10px] text-amber-400/80 mt-1 italic">
                    Part-time teachers do not manage a fixed form class. They teach their assigned subject(s) across classes.
                  </p>
                )}
              </div>

              {/* NERDC Subjects Multi-Select */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>What subject(s) will the teacher be teaching? (NERDC Curriculum):</span>
                  </span>
                  <span className="text-[11px] font-mono text-amber-400">
                    {assignedSubjects.length} selected
                  </span>
                </label>

                {/* Selected subjects tags */}
                {assignedSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-gray-900/60 rounded-xl border border-gray-700 max-h-24 overflow-y-auto">
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
                            className="hover:text-white cursor-pointer"
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
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search NERDC subjects (e.g. Mathematics, Biology, English)..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Scrollable multi-select subject list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-2 bg-gray-900/40 border border-gray-700 rounded-xl">
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
                            ? 'bg-rose-900/30 border-rose-700 text-gray-100 font-bold'
                            : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <div className="truncate text-[11px]">{subj.name}</div>
                          <div className="text-[9px] text-gray-500 font-mono">
                            {subj.code} • {subj.category || 'General'}
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-amber-500 border-amber-500 text-gray-950 font-bold'
                              : 'border-gray-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-2 border border-rose-800 transition cursor-pointer shadow-md mt-2"
              >
                <span>Save Teacher & Generate Credentials</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-xl w-full p-6 text-gray-100 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingTeacher(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg bg-gray-900 border border-gray-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-gray-50 mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-500" />
              <span>Update Faculty Staff Member</span>
            </h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">{editingTeacher.teacher_id_code}</p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Phone (+234):</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Email:</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Part-Time Toggle Switch */}
              <div className="p-3.5 bg-gray-900/90 border border-gray-700 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                    <span>Part-Time Teacher</span>
                    {editIsPartTime && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
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
                <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                    <span>What class will they be assigned to? (33-tier Hierarchy):</span>
                  </span>
                  {editIsPartTime && (
                    <span className="text-[10px] text-amber-400 italic">Disabled for Part-Time</span>
                  )}
                </label>
                <select
                  value={editFormClassId}
                  disabled={editIsPartTime}
                  onChange={(e) => setEditFormClassId(e.target.value)}
                  className={`w-full bg-gray-900 border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition ${
                    editIsPartTime
                      ? 'opacity-40 cursor-not-allowed border-gray-800 bg-gray-950/70 text-gray-500'
                      : 'border-gray-700 cursor-pointer'
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
                <label className="block text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Assigned Subjects (NERDC Curriculum):</span>
                  </span>
                  <span className="text-[11px] font-mono text-amber-400">
                    {editAssignedSubjects.length} selected
                  </span>
                </label>

                {editAssignedSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-gray-900/60 rounded-xl border border-gray-700 max-h-24 overflow-y-auto">
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
                            className="hover:text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search NERDC subjects..."
                    value={editSubjectSearch}
                    onChange={(e) => setEditSubjectSearch(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-2 bg-gray-900/40 border border-gray-700 rounded-xl">
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
                            ? 'bg-rose-900/30 border-rose-700 text-gray-100 font-bold'
                            : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <div className="truncate text-[11px]">{subj.name}</div>
                          <div className="text-[9px] text-gray-500 font-mono">
                            {subj.code} • {subj.category || 'General'}
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-amber-500 border-amber-500 text-gray-950 font-bold'
                              : 'border-gray-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Password Reset Option */}
              <div className="p-3 bg-gray-900/80 border border-gray-700 rounded-xl flex items-center gap-3">
                <input
                  type="checkbox"
                  id="resetCredentials"
                  checked={resetCredentials}
                  onChange={(e) => setResetCredentials(e.target.checked)}
                  className="rounded border-gray-700 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="resetCredentials" className="text-xs text-gray-300 cursor-pointer">
                  Revoke & Regenerate Credentials (Generates a new secure password)
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-2 border border-rose-800 transition cursor-pointer shadow-md"
              >
                <span>Save Staff Updates</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Copyable Credentials Popup */}
      {newCredentialsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-md w-full p-6 text-gray-100 shadow-2xl space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gray-900 text-amber-400 border border-gray-700">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-50">
                  {newCredentialsModal.isReset ? 'Credentials Revoked & Reset' : 'Teacher Registered Successfully'}
                </h3>
                <p className="text-xs text-gray-400">Secure staff login credentials generated.</p>
              </div>
            </div>

            <div className="p-4 bg-gray-900 border border-gray-700 rounded-2xl font-mono text-xs space-y-2 text-gray-300">
              <div>Staff: <strong className="text-white">{newCredentialsModal.teacherName}</strong></div>
              <div>Teacher ID: <strong className="text-amber-400">{newCredentialsModal.teacherIdCode}</strong></div>
              <div>Username: <strong className="text-gray-100">{newCredentialsModal.username}</strong></div>
              <div>Password: <strong className="text-rose-300">{newCredentialsModal.password}</strong></div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={copyCredentials}
                className="py-2.5 rounded-xl bg-gray-900 hover:bg-gray-700 text-amber-400 border border-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Info'}</span>
              </button>

              <button
                type="button"
                onClick={() => setNewCredentialsModal(null)}
                className="py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 border border-rose-800 font-bold text-xs transition cursor-pointer"
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
