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
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased bg-[#0B0F19] text-gray-100`}
    >
      <body className="min-h-full flex flex-col font-sans relative selection:bg-[#881337] selection:text-amber-100 bg-[#0B0F19] text-gray-100">
        {/* Permanent Matte Dark Background & Atmosphere */}
        <div
          className="fixed inset-0 bg-[#0B0F19] pointer-events-none z-0"
          aria-hidden="true"
        />
        <div
          className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(136,19,55,0.18),rgba(11,15,25,0))] pointer-events-none z-0"
          aria-hidden="true"
        />
        <div
          className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.06),transparent_40%)] pointer-events-none z-0"
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
