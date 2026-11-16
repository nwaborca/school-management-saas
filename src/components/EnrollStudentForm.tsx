'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { StudentProfile } from '@/types';
import { UserPlus, CheckCircle2, ShieldCheck, Lock, AlertCircle } from 'lucide-react';

interface EnrollStudentFormProps {
  defaultClassId?: string;
  defaultEnrolledByRole?: 'Bursar' | 'Principal' | 'Form Teacher';
  defaultEnrolledByName?: string;
  title?: string;
  description?: string;
  lockClassSelection?: boolean;
  onEnrolled?: (student: StudentProfile) => void;
}

export default function EnrollStudentForm({
  defaultClassId,
  defaultEnrolledByRole,
  defaultEnrolledByName,
  title = 'Enroll New Student',
  description = 'Register student with Nigerian international prefix (+234) and automated reg number generation.',
  lockClassSelection = false,
  onEnrolled,
}: EnrollStudentFormProps) {
  const { classes, generateStudentProfile, currentUser } = useApp();

  const [fullName, setFullName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(
    defaultClassId || classes.find((c) => c.name === 'SS1 Arm A')?.id || classes[0]?.id || ''
  );
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('+234');
  const [ndpaConsent, setNdpaConsent] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<StudentProfile | null>(null);
  const [enrollStatus, setEnrollStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  React.useEffect(() => {
    if (defaultClassId) {
      setSelectedClassId(defaultClassId);
    }
  }, [defaultClassId]);

  const targetRole =
    defaultEnrolledByRole ||
    (currentUser?.role === 'teacher' ? 'Form Teacher' : 'Bursar');

  const targetName =
    defaultEnrolledByName ||
    currentUser?.full_name ||
    (targetRole === 'Form Teacher' ? 'Class Form Teacher' : 'Finance Desk');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollStatus(null);
    if (!fullName.trim() || !parentName.trim()) return;

    if (!ndpaConsent) {
      setEnrollStatus({
        type: 'error',
        message: 'Parental/guardian consent is required under the Nigeria Data Protection Act (NDPA) 2023 to enroll minor students.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const targetClass = classes.find((c) => c.id === selectedClassId);
      const res = await generateStudentProfile({
        fullName: fullName.trim(),
        classId: selectedClassId,
        classGrade: targetClass?.name || 'SS1 Arm A',
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim().startsWith('+234')
          ? parentPhone.trim()
          : `+234${parentPhone.trim()}`,
        enrolledByRole: targetRole,
        enrolledByName: targetName,
        ndpaConsentGranted: true,
        consentTimestamp: new Date().toISOString(),
      });

      if (!res.success) {
        setEnrollStatus({
          type: 'error',
          message: `Database sync issue: ${res.error}. If foreign key or RLS failed, please apply the SQL update in supabase/fix_rls_policies.sql.`,
        });
        setIsSubmitting(false);
        return;
      }

      const newStudent = res.student;
      setCreatedStudent(newStudent);
      setEnrollStatus({
        type: 'success',
        message: `Student ${newStudent.full_name} successfully enrolled and synchronized with cloud database!`,
      });
      setFullName('');
      setParentName('');
      setParentPhone('+234');
      setNdpaConsent(false);

      if (onEnrolled) {
        onEnrolled(newStudent);
      }
    } catch (err: any) {
      console.error('CRITICAL: Student enrollment failure:', err);
      setEnrollStatus({
        type: 'error',
        message: err?.message || 'Could not complete student enrollment. Please verify database connection and constraints.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-600" />
          <span>{title}</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>

      {enrollStatus && enrollStatus.type === 'error' && (
        <div className="p-4 rounded-xl bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <strong className="block text-red-200 font-semibold mb-0.5">Enrollment Error:</strong>
            <span>{enrollStatus.message}</span>
          </div>
        </div>
      )}

      {createdStudent && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Student Enrolled Successfully!</span>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-slate-700 text-[11px] pt-1 border-t border-emerald-900/60">
            <div>Name: <strong className="text-white">{createdStudent.full_name}</strong></div>
            <div>Reg No: <strong className="text-blue-600">{createdStudent.reg_number}</strong></div>
            <div>Class: <strong className="text-white">{createdStudent.class_grade}</strong></div>
            <div>PIN: <strong className="text-blue-600">{createdStudent.access_pin}</strong></div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name:</label>
          <input
            type="text"
            required
            placeholder="e.g. Chidera Eze"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Class Arm:</label>
          <select
            value={selectedClassId}
            disabled={lockClassSelection}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer disabled:opacity-50"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Parent / Guardian Name:</label>
            <input
              type="text"
              required
              placeholder="e.g. Chief Eze"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Phone (+234):</label>
            <input
              type="text"
              required
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
            />
          </div>
        </div>

        {/* NDPA 2023 Statutory Parental Consent Checkbox Shield */}
        <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={ndpaConsent}
              onChange={(e) => setNdpaConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-600 focus:ring-offset-gray-900 cursor-pointer accent-amber-500"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              I confirm parental/guardian consent for processing minor academic and financial records in accordance with the <strong className="text-blue-600">Nigeria Data Protection Act (NDPA) 2023</strong>.
            </span>
          </label>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 pl-7">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>NDPC Statutory Compliance & Minor Data Privacy Protocol</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!ndpaConsent}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 border border-blue-600 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <UserPlus className="w-4 h-4 text-blue-600" />
          <span>Complete Enrollment & Generate PIN</span>
        </button>
      </form>
    </div>
  );
}
