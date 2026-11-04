'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { TeacherProfile } from '@/types';
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
} from 'lucide-react';

export default function TeacherRegistry() {
  const { classes, subjects, teachers, registerTeacher, updateTeacher, deleteTeacher } = useApp();

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

  // Register form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+234');
  const [email, setEmail] = useState('');
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [formClassId, setFormClassId] = useState('');

  // Edit form fields
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAssignedSubjects, setEditAssignedSubjects] = useState<string[]>([]);
  const [editFormClassId, setEditFormClassId] = useState('');
  const [resetCredentials, setResetCredentials] = useState(false);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    const res = registerTeacher({
      fullName: fullName.trim(),
      phone: phone.trim().startsWith('+234') ? phone.trim() : `+234${phone.trim()}`,
      email: email.trim(),
      assignedSubjectIds: assignedSubjects,
      formClassId: formClassId || undefined,
    });

    setIsRegisterOpen(false);
    setNewCredentialsModal({
      teacherName: res.teacher.full_name,
      teacherIdCode: res.teacher.teacher_id_code,
      username: res.teacher.username,
      password: res.initialPassword,
      isReset: false,
    });

    setFullName('');
    setPhone('+234');
    setEmail('');
    setAssignedSubjects([]);
    setFormClassId('');
  };

  const openEdit = (t: TeacherProfile) => {
    setEditingTeacher(t);
    setEditFullName(t.full_name);
    setEditPhone(t.phone);
    setEditEmail(t.email);
    setEditAssignedSubjects(t.assigned_subject_ids || []);
    setEditFormClassId(t.form_class_id || '');
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
      formClassId: editFormClassId || undefined,
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
            Register teachers with automated ID generation, subject multi-allocation, and credential reset controls.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center gap-2 border border-rose-800 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Register New Teacher</span>
        </button>
      </div>

      {/* Teachers Roster Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-700 bg-gray-800">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider text-[11px] border-b border-gray-700">
            <tr>
              <th className="px-4 py-3">Teacher ID & Name</th>
              <th className="px-4 py-3">Contact (+234)</th>
              <th className="px-4 py-3">Form Class Role</th>
              <th className="px-4 py-3">Assigned Subjects</th>
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
                const formCls = classes.find((c) => c.id === t.form_class_id);
                const assignedSubjs = subjects.filter((s) => (t.assigned_subject_ids || []).includes(s.id));

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
                      {formCls ? (
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
                      <button
                        onClick={() => openEdit(t)}
                        className="px-3 py-1 rounded-lg bg-gray-900 hover:bg-gray-700 text-amber-400 font-bold text-[11px] border border-gray-700 transition cursor-pointer"
                      >
                        Edit / Reset
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Register Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-lg w-full p-6 text-gray-100 shadow-2xl relative">
            <button
              onClick={() => setIsRegisterOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg bg-gray-900 border border-gray-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-gray-50 mb-4">Register New Teacher</h3>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ngozi Adeleke"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Form Class Role (Optional):</label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="">-- None (Subject Teacher Only) --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-2 border border-rose-800 transition cursor-pointer"
              >
                <span>Save Teacher & Generate Credentials</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl max-w-lg w-full p-6 text-gray-100 shadow-2xl relative">
            <button
              onClick={() => setEditingTeacher(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg bg-gray-900 border border-gray-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-gray-50 mb-1">Update Staff Member</h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">{editingTeacher.teacher_id_code}</p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
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
