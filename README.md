# EduNexus SaaS - Multi-Tenant School Management Platform with 3D UI

A modern, commercial-ready Multi-Tenant School Management SaaS engineered with Next.js (App Router, TypeScript), Tailwind CSS, Supabase (PostgreSQL with Row-Level Security), and interactive 3D WebGL components powered by Three.js, `@react-three/fiber`, and `@react-three/drei`.

---

## 🏛️ System Architecture

### 1. Multi-Tenant Role-Based Isolation
- **Tenant Isolation**: Every school operates on its own workspace or subdomain (e.g., `st-jude.edunexus.io`, `horizon-stem.edunexus.io`). All queries are scoped by `tenant_id` at the database level with PostgreSQL Row-Level Security (`RLS`).
- **Granular Roles**:
  - **Super Admin (Principal)**: Campus telemetry, certified faculty directory, school settings, and emergency campus-wide broadcasts.
  - **Teacher**: Class rosters, dynamic score-to-letter grading with instant recalculation, attendance marking, and direct student remarks.
  - **Student**: Gamified 3D honors trophies and badges, cumulative GPA tracking, daily timetable, and official transcripts.
  - **Parent / Guardian**: Student performance telemetry, attendance notifications, fee balance tracking, and direct teacher inquiry forms.

### 2. Feature Modules
- **Academic Hub (`/academic`)**:
  - Class rosters with capacity tracking.
  - Interactive Gradebook with live score-to-letter auto-recomputation (A+, A, B, etc.) and teacher remarks.
  - Daily Attendance Tracker with 1-click status toggling (Present, Late, Absent, Excused).
  - Official Report Card Generator with printable student transcript modal and GPA audit.
- **Financial Engine (`/finance`)**:
  - Real-time receivables dashboard (Total Invoiced, Collected Revenue, Outstanding Balance).
  - Itemized tuition schedules (Curriculum, Lab Fees, Technology, Athletics).
  - Fee status badges (`paid`, `pending`, `partial`, `overdue`).
  - Interactive Stripe Payment Gateway Stub with test checkout and live ledger status update.
- **Parent Portal (`/parent`)**:
  - Real-time student academic progress tracking.
  - Institutional and faculty announcement feed with urgency/priority indicators (`urgent`, `high`, `medium`).
  - Direct teacher communication desk.
- **Student Dashboard (`/student`)**:
  - Interactive 3D Achievement Hall featuring 360-degree rotatable honors trophies.
  - Switch between awards: Grand Academic Laureate Trophy, STEM Innovation Orb, Exemplary Attendance Star.
  - Cumulative GPA and honors point leaderboards.
- **Admin Hub (`/admin`)**:
  - Multi-tenant school workspace switcher, capacity stats, and broadcast message dispatcher.

### 3. Interactive 3D WebGL Features & Fallback
- **Landing Page Hero 3D Emblem**:
  - Interactive floating academy globe/astrolabe responding smoothly to cursor hover and mouse inertia.
  - Dynamic specular lighting, metallic materials, and orbiting academic particles.
- **Student 3D Achievement Trophies**:
  - 360-degree rotatable metallic trophy cups and ribbons via OrbitControls.
- **Graceful 2D Fallback**:
  - Automatic detection of WebGL capability via `webgl-detector.ts`. If WebGL is absent, unsupported, or disabled, the app seamlessly renders vector-animated glowing 2D crests and medals without breaking the UI.

---

## 🚀 Getting Started

### Local Development
```bash
cd school-management-saas
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm run start
```

---

## 🗄️ Database Schema & Supabase Setup

The complete PostgreSQL database schema with Row-Level Security policies is available in:
📁 [`schema.sql`](./schema.sql)

To deploy to Supabase:
1. Create a project in [Supabase](https://supabase.com).
2. Go to the SQL Editor in Supabase.
3. Paste and run the contents of [`schema.sql`](./schema.sql).
4. Copy your project URL and Anon key into `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

*Note: The platform features zero-config mock data mode, allowing you to test all multi-tenant workspaces and role portals immediately out-of-the-box!*
