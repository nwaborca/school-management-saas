'use client';

import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Camera, AlertCircle, X, Shield, RefreshCw } from 'lucide-react';

interface StaffAttendanceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
}

export default function StaffAttendanceScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: StaffAttendanceScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900">
              Scan School Attendance QR
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="p-4 space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square flex items-center justify-center border border-slate-200">
            <Scanner
              onScan={(detectedCodes) => {
                if (detectedCodes && detectedCodes.length > 0) {
                  const rawValue = detectedCodes[0]?.rawValue;
                  if (rawValue) {
                    onScanSuccess(rawValue);
                  }
                }
              }}
              onError={(err) => {
                console.warn('QR scanner camera error:', err);
                setErrorMsg('Camera access failed or was denied. Please grant permission in your browser settings.');
              }}
              components={{
                finder: true,
              }}
              styles={{
                container: { width: '100%', height: '100%' },
              }}
            />
          </div>

          <p className="text-center text-[11px] text-slate-500">
            Aim your camera at the printed Gate / Staffroom Attendance QR poster.
          </p>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
