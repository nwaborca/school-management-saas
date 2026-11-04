import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Navbar } from '@/components/navigation/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Apex Academy | Modern School Management & Student Portal',
  description:
    'Lightweight, clean school management platform with PIN-based student logins, term results, report cards, and fee tracking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased bg-slate-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors duration-200`}
    >
      <body className="min-h-full flex flex-col font-sans relative selection:bg-rose-900 selection:text-amber-100">
        {/* Global Campus Background Image Wrapper */}
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat bg-fixed w-full h-full pointer-events-none z-0"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
          aria-hidden="true"
        />

        {/* Global Readability Backdrop / Scrim */}
        <div
          className="fixed inset-0 bg-slate-50/85 dark:bg-gray-950/85 backdrop-blur-[1px] pointer-events-none z-0 transition-colors duration-200"
          aria-hidden="true"
        />

        <AppProvider>
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
