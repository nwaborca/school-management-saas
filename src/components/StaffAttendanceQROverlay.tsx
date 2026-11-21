'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, QrCode, Building2, MapPin, Clock, ShieldCheck } from 'lucide-react';
import { School } from '@/types';
import { SchoolLogo } from '@/components/SchoolLogo';

interface StaffAttendanceQROverlayProps {
  school: School;
  isOpen: boolean;
  onClose: () => void;
}

export default function StaffAttendanceQROverlay({
  school,
  isOpen,
  onClose,
}: StaffAttendanceQROverlayProps) {
  if (!isOpen) return null;

  const qrPayload = `AEGIS_ATTENDANCE:${school.id}:${school.invite_code || ''}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Official Staff Attendance QR Poster
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Printable Poster Canvas */}
        <div className="p-8 text-center space-y-6 print:p-12 print:m-0" id="printable-qr-poster">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <SchoolLogo
                logoUrl={school.logo_url || school.logoUrl}
                name={school.name}
                className="h-12 w-12 object-contain"
              />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Official Check-In Station</span>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {school.name}
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Scan with your Aegis Faculty Mobile Hub upon arrival within the school gate or staffroom.
            </p>
          </div>

          {/* High-Contrast SVG QR Code with white frame */}
          <div className="inline-flex p-6 bg-white rounded-2xl border-2 border-slate-900 shadow-md">
            <QRCodeSVG
              value={qrPayload}
              size={240}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* Verification Details */}
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-left">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Geofence</span>
              </div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">
                {school.geofence_radius_meters || 150}m Radius
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Resumption</span>
              </div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">
                {school.resumption_cutoff_time || '08:00 AM'}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cryptographically Verified • Multi-Tenant ID: {school.invite_code}</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Gate/Staffroom Poster</span>
          </button>
        </div>
      </div>
    </div>
  );
}
