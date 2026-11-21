'use client';

import React from 'react';
import { SchoolAccessStatus } from '@/types';
import { Clock, AlertTriangle, MessageCircle, LogOut } from 'lucide-react';

interface AccessGateModalProps {
  status: SchoolAccessStatus;
  schoolName: string;
  inviteCode: string;
  onSignOut: () => void;
}

export function AccessGateModal({ status, schoolName, inviteCode, onSignOut }: AccessGateModalProps) {
  const isPending = status === 'PENDING_APPROVAL';

  const pendingWhatsappUrl = `https://wa.me/2349034616893?text=${encodeURIComponent(
    `Hello Forvica Global Venture, we registered ${schoolName} (${inviteCode}) on Aegis and are awaiting 1-term free pilot activation.`
  )}`;

  const renewalWhatsappUrl = `https://wa.me/2349034616893?text=${encodeURIComponent(
    `Hello Forvica Global Venture, our academic term for ${schoolName} (${inviteCode}) has concluded. We would like to request our renewal term invoice.`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner">
          {isPending ? (
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {isPending ? (
              <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300">
                Awaiting Founder Activation
              </span>
            ) : (
              <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-300">
                Academic Term Concluded
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {isPending ? 'Awaiting Access Verification' : 'Academic Term Concluded'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            {isPending ? (
              <>
                <strong>{schoolName}</strong> ({inviteCode}) has been registered. Your institution’s <strong>1-Term Free Pilot</strong> will be activated once verified by Founder management.
              </>
            ) : (
              <>
                Portal access for <strong>{schoolName}</strong> ({inviteCode}) for this academic term has concluded. Please contact the administrator or request your renewal invoice on WhatsApp.
              </>
            )}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Institution:</span>
            <span className="font-bold text-slate-800">{schoolName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Invite Code:</span>
            <span className="font-mono font-bold text-slate-900 tracking-wider">{inviteCode}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Channel:</span>
            <span className="text-slate-700 font-medium">Forvica Global Venture</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <a
            href={isPending ? pendingWhatsappUrl : renewalWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 shrink-0" />
            <span>
              {isPending
                ? 'Verify & Activate on WhatsApp (+234 903 461 6893)'
                : 'Request Term Invoice on WhatsApp (+234 903 461 6893)'}
            </span>
          </a>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>Sign Out & Switch School</span>
          </button>
        </div>
      </div>
    </div>
  );
}
