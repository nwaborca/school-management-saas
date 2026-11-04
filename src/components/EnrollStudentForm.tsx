'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { StudentProfile } from '@/types';
import { UserPlus, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !parentName.trim()) return;

    if (!ndpaConsent) {
      alert('Parental/guardian consent is required under the Nigeria Data Protection Act (NDPA) 2023 to enroll minor students.');
      return;
    }

    const targetClass = classes.find((c) => c.id === selectedClassId);
    const newStudent = generateStudentProfile({
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

    setCreatedStudent(newStudent);
    setFullName('');
    setParentName('');
    setParentPhone('+234');
    setNdpaConsent(false);

    if (onEnrolled) {
      onEnrolled(newStudent);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 sm:p-8 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-50 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-amber-500" />
          <span>{title}</span>
        </h3>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </div>

      {createdStudent && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Student Enrolled Successfully!</span>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-gray-300 text-[11px] pt-1 border-t border-emerald-900/60">
            <div>Name: <strong className="text-white">{createdStudent.full_name}</strong></div>
            <div>Reg No: <strong className="text-amber-400">{createdStudent.reg_number}</strong></div>
            <div>Class: <strong className="text-white">{createdStudent.class_grade}</strong></div>
            <div>PIN: <strong className="text-amber-400">{createdStudent.access_pin}</strong></div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Student Full Name:</label>
          <input
            type="text"
            required
            placeholder="e.g. Chidera Eze"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Assigned Class Arm:</label>
          <select
            value={selectedClassId}
            disabled={lockClassSelection}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
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
            <label className="block text-xs font-semibold text-gray-300 mb-1">Parent / Guardian Name:</label>
            <input
              type="text"
              required
              placeholder="e.g. Chief Eze"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Parent Phone (+234):</label>
            <input
              type="text"
              required
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
            />
          </div>
        </div>

        {/* NDPA 2023 Statutory Parental Consent Checkbox Shield */}
        <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-700 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={ndpaConsent}
              onChange={(e) => setNdpaConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-900 cursor-pointer accent-amber-500"
            />
            <span className="text-xs text-gray-300 leading-relaxed">
              I confirm parental/guardian consent for processing minor academic and financial records in accordance with the <strong className="text-amber-400">Nigeria Data Protection Act (NDPA) 2023</strong>.
            </span>
          </label>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 pl-7">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>NDPC Statutory Compliance & Minor Data Privacy Protocol</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!ndpaConsent}
          className="w-full py-3.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-gray-50 font-bold text-xs flex items-center justify-center gap-2 border border-rose-800 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <UserPlus className="w-4 h-4 text-amber-400" />
          <span>Complete Enrollment & Generate PIN</span>
        </button>
      </form>
    </div>
  );
}
