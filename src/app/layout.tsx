import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Navbar } from '@/components/navigation/Navbar';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Aegis — School Operations, Grading & Fee Management',
  description:
    'Complete school management SaaS for Nigerian Nursery, Primary, and Secondary schools. Manage CA1/CA2/Exam broadsheets, generate WAEC/NECO-aligned report cards, and verify school fee payments in one unified portal.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#F8FAFC] text-[#0F172A]`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-[#0F172A] selection:bg-[#1D4ED8] selection:text-white">
        <AppProvider>
          <div className="relative z-10 flex flex-col min-h-screen">
            <Suspense fallback={<div className="h-16 bg-white border-b border-slate-200" />}>
              <Navbar />
            </Suspense>
            <main className="flex-1">{children}</main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
