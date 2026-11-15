'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { CrystalizedBall } from '@/components/CrystalizedBall';
import { AnimatedContent } from '@/components/AnimatedContent';
import {
  GraduationCap,
  KeyRound,
  FileText,
  DollarSign,
  Shield,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Users,
  Award,
  Sparkles,
  BookOpen,
  Clock,
  Compass,
  Building2,
  Lock,
  ChevronRight,
  Briefcase,
  Layers,
} from 'lucide-react';

export default function HomePage() {
  const { schoolInfo } = useApp();

  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 pb-20 transition-colors duration-200 overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 pb-16 md:pt-14 md:pb-24 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedContent
            distance={100}
            direction="vertical"
            duration={0.8}
            ease="power3.out"
            blur={0}
            stagger={0.08}
            threshold={0.1}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Content */}
              <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111827] border border-amber-500/40 text-amber-400 text-xs font-semibold shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-gray-200">
                    Premier Nigerian Academic Institution • Session {schoolInfo.academic_year}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                  Academic Excellence & <br />
                  <span className="text-[#D97706] drop-shadow-sm font-extrabold">
                    Institutional Governance
                  </span>
                </h1>

                <p className="text-gray-300 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  Standardized school management platform engineered specifically for the 33-tier Nigerian educational hierarchy from <strong className="text-white font-semibold">Creche through Senior Secondary 3 (Arms A–F)</strong>. Secure PIN-based credential access, continuous assessment grading (CA1, CA2, Term Exam), digital WAEC/NECO transcripts, and automated bursary verification in <strong className="text-amber-400 font-semibold">Naira (₦)</strong>.
                </p>

                {/* Call to Action */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-rose-900 to-rose-950 hover:from-rose-800 hover:to-rose-900 text-gray-50 font-bold text-sm border border-rose-700/60 flex items-center justify-center gap-2.5 transition-all shadow-lg hover:shadow-rose-900/40 hover:-translate-y-0.5"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Admin Portal / Login</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </Link>

                  <a
                    href="#curriculum"
                    className="w-full sm:w-auto px-7 py-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/80 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold text-sm border border-gray-300 dark:border-gray-700 flex items-center justify-center gap-2 transition"
                  >
                    <BookOpen className="w-4 h-4 text-rose-500" />
                    <span>Explore Curriculum</span>
                  </a>
                </div>

                {/* Key Badges */}
                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    <span className="text-gray-700 dark:text-gray-200 font-medium">Reg No + PIN Authentication</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-amber-500" />
                    <span className="text-gray-700 dark:text-gray-200 font-medium">Full Mobile Optimization</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-500" />
                    <span className="text-gray-700 dark:text-gray-200 font-medium">WAEC & NECO Standardized</span>
                  </div>
                </div>
              </div>

              {/* Right Hero Visual: Interactive WebGL on Desktop, High-Performance Emblem on Mobile */}
              <div className="lg:col-span-6 flex items-center justify-center">
                {/* Desktop/Tablet: CrystalizedBall */}
                <div className="hidden md:block w-full rounded-3xl bg-[#111827] border border-gray-800 p-2 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B0F19] border border-amber-500/30 text-amber-400 text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>APEX QUANTUM CORE</span>
                  </div>

                  {/* Required CrystalizedBall container */}
                  <div style={{ width: '100%', height: '600px', position: 'relative' }}>
                    <CrystalizedBall
                      preset="plasma"
                      color="#F25BD0"
                      size={0.7}
                      crackle={0.85}
                      fill={0.5}
                      interactive
                      hoverStrength={0.7}
                    />
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0B0F19] border border-gray-800 text-xs text-gray-400">
                    <span className="font-serif italic text-amber-300">{schoolInfo.motto}</span>
                    <span className="text-[11px] text-gray-500">Interactive WebGL Plasma Engine</span>
                  </div>
                </div>

                {/* Mobile Fallback: Lightweight, Battery-Efficient Academic Shield Hero */}
                <div className="block md:hidden w-full rounded-3xl bg-[#111827] border border-gray-800 p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gray-800 border border-gray-700 flex items-center justify-center text-amber-400 shadow-lg">
                    <GraduationCap className="w-10 h-10" />
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-amber-400 text-xs font-mono font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>APEX DIGITAL PORTAL</span>
                    </div>
                    <h3 className="text-xl font-black text-white">{schoolInfo.name}</h3>
                    <p className="text-xs text-amber-300/90 font-serif italic">{schoolInfo.motto}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-left">
                    <div className="p-3 rounded-xl bg-gray-900 border border-gray-800">
                      <span className="text-[10px] text-gray-400 block font-mono">ACADEMIC ARM</span>
                      <strong className="text-xs text-gray-200 font-bold">Creche – SS3 F</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-900 border border-gray-800">
                      <span className="text-[10px] text-gray-400 block font-mono">STANDARDS</span>
                      <strong className="text-xs text-amber-400 font-bold">WAEC / NECO</strong>
                    </div>
                  </div>

                  <Link
                    href="/login"
                    className="w-full py-3.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-white font-bold text-xs flex items-center justify-center gap-2 border border-rose-700 shadow-md transition"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Portal Sign In</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </Link>
                </div>
              </div>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* 2. ABOUT OUR INSTITUTION */}
      <section className="py-20 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedContent
            distance={100}
            direction="vertical"
            duration={0.8}
            ease="power3.out"
            blur={0}
            stagger={0.08}
            threshold={0.1}
          >
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="px-3.5 py-1.5 rounded-full bg-rose-950/50 border border-rose-800/60 text-rose-400 text-xs font-semibold uppercase tracking-wider">
                Heritage & Pedigree
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">
                About Apex Academy Nigeria
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                Founded on the bedrock of uncompromising academic discipline, high moral rectitude, and forward-looking technological innovation, Apex Academy stands as a vanguard of pre-tertiary education in West Africa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 shadow-md hover:border-amber-500/50 transition">
                <div className="w-12 h-12 rounded-xl bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-6">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Academic Pedigree</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  Consistently ranking in the 99th percentile across WAEC and NECO examinations, producing scholars who transition seamlessly into global Ivy League, Russell Group, and top Nigerian universities.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 shadow-md hover:border-amber-500/50 transition">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Unflinching Discipline</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  Character formation remains central to our curriculum. We instill core values of integrity, punctuality, intellectual humility, and leadership through structured mentorship.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 shadow-md hover:border-amber-500/50 transition">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Digital Governance</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  Every continuous assessment mark, term result, and tuition clearance is cryptographically auditable, offering complete transparency for parents and regulatory bodies.
                </p>
              </div>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* 3. VISION & MISSION STATEMENTS */}
      <section className="py-20 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedContent
            distance={100}
            direction="vertical"
            duration={0.8}
            ease="power3.out"
            blur={0}
            stagger={0.08}
            threshold={0.1}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
              {/* Vision Card */}
              <div className="relative p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-rose-950/80 via-gray-900 to-gray-950 border border-rose-800/40 shadow-xl overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-900/60 text-rose-300 text-xs font-semibold">
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>OUR VISION</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Shaping Africa’s Preeminent Minds for Global Relevance
                  </h3>
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    To be the foremost benchmark institution in Africa for holistic early childhood, primary, and secondary education, producing principled global leaders, scientists, and innovators equipped to solve the continent’s most complex societal and economic challenges.
                  </p>
                </div>
                <div className="pt-8 border-t border-rose-900/50 mt-6 flex items-center gap-4 text-xs text-amber-400 font-medium">
                  <span>Excellence</span> • <span>Character</span> • <span>Global Readiness</span>
                </div>
              </div>

              {/* Mission Card */}
              <div className="relative p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-amber-950/40 via-gray-900 to-gray-950 border border-amber-600/30 shadow-xl overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/60 text-amber-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>OUR MISSION</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Nurturing Intellect, Morals, and Technological Competence
                  </h3>
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    To deliver rigorous, internationally aligned curricula rooted in African cultural pride; empowering students through world-class educators, modern laboratory environments, state-of-the-art computational infrastructure, and robust character-building initiatives.
                  </p>
                </div>
                <div className="pt-8 border-t border-amber-900/50 mt-6 flex items-center gap-4 text-xs text-amber-400 font-medium">
                  <span>Rigorous Academics</span> • <span>Digital Fluency</span> • <span>Integrity</span>
                </div>
              </div>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* 4. ACADEMIC STRUCTURE & CURRICULUM */}
      <section id="curriculum" className="py-20 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedContent
            distance={100}
            direction="vertical"
            duration={0.8}
            ease="power3.out"
            blur={0}
            stagger={0.08}
            threshold={0.1}
          >
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
                Full Nigerian Educational Framework
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">
                33-Tier Educational Architecture
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                Seamless progression through early childhood developmental stages, foundational primary schooling, junior secondary basic education, and arm-segregated senior secondary streams.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Early Childhood */}
              <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    01
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Early Childhood</h4>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Creche to Nursery 3 (5 Tiers)</p>
                  <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                    Sensory discovery, early phonics, numeracy habits, psychomotor play, and environmental socialization.
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 mt-4 text-[11px] text-gray-500 dark:text-gray-400">
                  Phonics • Play Habits • Creative Arts
                </div>
              </div>

              {/* Lower & Upper Primary */}
              <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    02
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Basic Primary</h4>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Primary 1 to Primary 6 (6 Tiers)</p>
                  <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                    National curriculum standards: English Studies, Mathematics, Basic Science & Technology, Nigerian History, and Civic Literacy.
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 mt-4 text-[11px] text-gray-500 dark:text-gray-400">
                  National Common Entrance Preparation
                </div>
              </div>

              {/* Junior Secondary */}
              <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                    03
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Junior Secondary</h4>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">JSS 1 to JSS 3 (3 Tiers)</p>
                  <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                    BECE/Junior WAEC certification covering Business Studies, Digital Technologies, French, Basic Tech, and Agricultural Science.
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 mt-4 text-[11px] text-gray-500 dark:text-gray-400">
                  BECE / Junior WAEC Certification
                </div>
              </div>

              {/* Senior Secondary */}
              <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    04
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Senior Secondary</h4>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">SS1 to SS3 (Arms A through F)</p>
                  <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                    18 Arm-segregated cohorts specialized into Science, Humanities, and Commercial tracks for WASSCE, NECO SSCE, and UTME mastery.
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 mt-4 text-[11px] text-gray-500 dark:text-gray-400">
                  WAEC • NECO • JAMB UTME Ready
                </div>
              </div>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* 5. LEADERSHIP & ADMINISTRATION */}
      <section className="py-20 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedContent
            distance={100}
            direction="vertical"
            duration={0.8}
            ease="power3.out"
            blur={0}
            stagger={0.08}
            threshold={0.1}
          >
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="px-3.5 py-1.5 rounded-full bg-rose-950/50 border border-rose-800/60 text-rose-400 text-xs font-semibold uppercase tracking-wider">
                Institutional Governance
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">
                Leadership, Bursary & Administration
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                Operating under rigorous governance principles led by the Principal's Directorate and the Bursar's Office to ensure fiduciary transparency and academic excellence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Principal Governance */}
              <div className="p-8 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-md flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Principal's Directorate</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Academic Governance & Quality Assurance</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Oversees teaching quality across all 33 class arms, approves terminal result publications, audits Continuous Assessment marks, and enforces institutional discipline.
                  </p>
                </div>
                <div className="pt-6 border-t border-gray-100 dark:border-gray-700/60 mt-6 flex items-center justify-between text-xs text-gray-500">
                  <span>Executive Governance</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">Academic Board</span>
                </div>
              </div>

              {/* Bursar's Office */}
              <div className="p-8 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-md flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bursar's Treasury Desk</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Fiduciary Audits & Bank Slip Verification</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Reconciles tuition bank deposits, validates teller receipts, authorizes partial payment ledgers, and controls financial clearance gates for term results.
                  </p>
                </div>
                <div className="pt-6 border-t border-gray-100 dark:border-gray-700/60 mt-6 flex items-center justify-between text-xs text-gray-500">
                  <span>Audited Ledgers</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Zero Leakage</span>
                </div>
              </div>

              {/* Faculty Registry */}
              <div className="p-8 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-md flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Faculty & Subject Registry</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Teacher Allocations & Continuous Assessment</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Empowers subject instructors to log CA1 (20%), CA2 (20%), and Exam (60%) scores securely with instant algorithmic grading, remarks, and class ranking calculations.
                  </p>
                </div>
                <div className="pt-6 border-t border-gray-100 dark:border-gray-700/60 mt-6 flex items-center justify-between text-xs text-gray-500">
                  <span>RBAC Security</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Live Gradebook</span>
                </div>
              </div>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* 6. CALL TO ACTION FOOTER BANNER */}
      <section className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedContent
            distance={100}
            direction="vertical"
            duration={0.8}
            ease="power3.out"
            blur={0}
            stagger={0.08}
            threshold={0.1}
          >
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-gray-900 via-rose-950 to-gray-900 border border-rose-800/50 shadow-2xl text-center space-y-6">
              <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Secure Access for Students, Faculty & Bursary
              </h3>
              <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto font-normal">
                Log in with your official institutional credentials to view Continuous Assessment scores, download certified terminal report cards, or manage school fee clearance.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-white font-bold text-sm border border-rose-700 flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Sign In to Institutional Portal</span>
                </Link>
              </div>
            </div>
          </AnimatedContent>
        </div>
      </section>
    </div>
  );
}
