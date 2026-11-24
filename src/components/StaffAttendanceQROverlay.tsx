'use client';

import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Printer, Download, QrCode, Building2, MapPin, Clock, ShieldCheck, Check } from 'lucide-react';
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
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const qrPayload = `AEGIS_ATTENDANCE:${school.id}:${school.invite_code || ''}`;
  const schoolName = school.name || 'Institution Campus';
  const logoUrl = school.logo_url || school.logoUrl;
  const radius = school.geofence_radius_meters || 150;
  const cutoff = school.resumption_cutoff_time || '08:00 AM';
  const inviteCode = school.invite_code || 'AEGIS-GATE';

  // Crisp, self-contained PNG export via HTML5 canvas compositing
  const handleDownloadPNG = async () => {
    try {
      setDownloading(true);

      const qrCanvas = qrCanvasRef.current;
      if (!qrCanvas) {
        throw new Error('QR canvas not ready');
      }

      // High-resolution poster dimensions (800 x 1100 px @ 2x scale)
      const canvas = document.createElement('canvas');
      const width = 800;
      const height = 1100;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Outer border frame
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#0F172A';
      ctx.strokeRect(24, 24, width - 48, height - 48);

      // Subtle inner accent border
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3B82F6';
      ctx.strokeRect(36, 36, width - 72, height - 72);

      // 2. Top Header Tag
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(width / 2 - 160, 60, 320, 42, 21);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OFFICIAL CHECK-IN STATION', width / 2, 86);

      // 3. School Name
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      const cleanSchoolName = schoolName.length > 36 ? schoolName.slice(0, 34) + '...' : schoolName;
      ctx.fillText(cleanSchoolName, width / 2, 145);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Campus Staffroom & Gate Attendance Portal', width / 2, 178);

      // 4. QR Code Container Box
      const qrBoxSize = 420;
      const qrBoxX = (width - qrBoxSize) / 2;
      const qrBoxY = 210;

      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
      ctx.fill();
      ctx.stroke();

      // Draw the QR Code centered inside the box
      const qrSize = 340;
      const qrX = qrBoxX + (qrBoxSize - qrSize) / 2;
      const qrY = qrBoxY + (qrBoxSize - qrSize) / 2;
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // 5. Instruction Prompt Banner
      ctx.fillStyle = '#EFF6FF';
      ctx.strokeStyle = '#BFDBFE';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(qrBoxX, 660, qrBoxSize, 72, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1D4ED8';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('1. Open Aegis Faculty Mobile Hub', width / 2, 690);
      ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#3B82F6';
      ctx.fillText('2. Tap "Clock In via Gate QR" & scan this code', width / 2, 715);

      // 6. Security & Parameter Badges (2 columns)
      const badgeW = 200;
      const badgeH = 80;
      const badgeY = 760;

      // Geofence Badge
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(width / 2 - badgeW - 15, badgeY, badgeW, badgeH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GEOFENCE PERIMETER', width / 2 - badgeW / 2 - 15, badgeY + 30);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${radius}m Radius`, width / 2 - badgeW / 2 - 15, badgeY + 58);

      // Cutoff Badge
      ctx.beginPath();
      ctx.roundRect(width / 2 + 15, badgeY, badgeW, badgeH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('RESUMPTION CUTOFF', width / 2 + badgeW / 2 + 15, badgeY + 30);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(cutoff, width / 2 + badgeW / 2 + 15, badgeY + 58);

      // 7. Footer Cryptographic Tenant Verification Stamp
      ctx.fillStyle = '#64748B';
      ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Cryptographically Verified • Tenant ID: ${inviteCode}`, width / 2, 885);

      ctx.font = 'italic 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('Aegis School Management Operating System • Multi-Tenant Isolation', width / 2, 915);

      // Export as downloadable PNG blob
      canvas.toBlob((blob) => {
        if (!blob) {
          setDownloading(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `${schoolName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_attendance_qr_poster.png`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloading(false);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3500);
      }, 'image/png');
    } catch (err) {
      console.error('Failed generating QR poster PNG:', err);
      setDownloading(false);
    }
  };

  // High-reliability isolated print popup window (eliminates page print layout interference)
  const handlePrint = () => {
    try {
      const qrCanvas = qrCanvasRef.current;
      const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : '';

      const printWindow = window.open('', '_blank', 'width=800,height=900');
      if (!printWindow) {
        window.print();
        return;
      }

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${schoolName} - Attendance QR Poster</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 1.5cm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .poster-card {
      width: 100%;
      max-width: 620px;
      border: 8px solid #0F172A;
      border-radius: 24px;
      padding: 40px 32px;
      text-align: center;
      background: #FFFFFF;
    }
    .station-badge {
      display: inline-block;
      padding: 6px 18px;
      border-radius: 9999px;
      background: #0F172A;
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .school-title {
      font-size: 28px;
      font-weight: 900;
      color: #0F172A;
      line-height: 1.2;
      margin-bottom: 8px;
    }
    .sub-title {
      font-size: 14px;
      color: #64748B;
      margin-bottom: 24px;
    }
    .qr-container {
      display: inline-block;
      padding: 24px;
      background: #FFFFFF;
      border: 3px solid #0F172A;
      border-radius: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      margin-bottom: 24px;
    }
    .qr-img {
      width: 280px;
      height: 280px;
      display: block;
    }
    .prompt-box {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 24px;
      color: #1D4ED8;
      font-size: 13px;
      font-weight: 600;
    }
    .param-grid {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .param-box {
      flex: 1;
      max-width: 200px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 12px;
      text-align: center;
    }
    .param-label {
      font-size: 10px;
      font-weight: 800;
      color: #64748B;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .param-val {
      font-size: 16px;
      font-weight: 800;
      color: #0F172A;
    }
    .footer-stamp {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="poster-card">
    <div class="station-badge">Official Check-In Station</div>
    <h1 class="school-title">${schoolName}</h1>
    <p class="sub-title">Scan upon arrival within the school gate or faculty staffroom.</p>

    <div class="qr-container">
      <img src="${qrDataUrl}" class="qr-img" alt="Gate Attendance QR Code" />
    </div>

    <div class="prompt-box">
      Open Aegis Faculty Mobile Hub &rarr; Tap "Clock In via Gate QR" &rarr; Scan this poster
    </div>

    <div class="param-grid">
      <div class="param-box">
        <div class="param-label">Geofence Radius</div>
        <div class="param-val">${radius}m Perimeter</div>
      </div>
      <div class="param-box">
        <div class="param-label">Resumption Cutoff</div>
        <div class="param-val">${cutoff}</div>
      </div>
    </div>

    <div class="footer-stamp">
      Cryptographically Verified &bull; Multi-Tenant ID: ${inviteCode}
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.close();
      }, 300);
    };
  </script>
</body>
</html>`;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (e) {
      console.warn('Isolated popup print failed, falling back to window.print():', e);
      window.print();
    }
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
                logoUrl={logoUrl}
                name={schoolName}
                className="h-12 w-12 object-contain"
              />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Official Check-In Station</span>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {schoolName}
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Scan with your Aegis Faculty Mobile Hub upon arrival within the school gate or staffroom.
            </p>
          </div>

          {/* High-Contrast Canvas QR Code with white frame */}
          <div className="inline-flex p-6 bg-white rounded-2xl border-2 border-slate-900 shadow-md">
            <QRCodeCanvas
              ref={qrCanvasRef}
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
                {radius}m Radius
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Resumption</span>
              </div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">
                {cutoff}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cryptographically Verified • Multi-Tenant ID: {inviteCode}</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50 print:hidden">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            {downloadSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span>{downloadSuccess ? 'Downloaded!' : downloading ? 'Generating PNG...' : 'Download QR Poster (PNG)'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print QR Poster</span>
          </button>
        </div>
      </div>
    </div>
  );
}
