import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSchoolAccessRegistry, resolveSchoolAccess } from '@/lib/founderAccess';

// Resolve Supabase Client with service role if available, otherwise anonymous server client
function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  const keyToUse = serviceKey || anonKey;
  return createClient(url, keyToUse, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, schoolCode, identifier, password, regNumber, pin } = body;

    const cleanSchoolCode = (schoolCode || '').trim().toUpperCase();

    if (!cleanSchoolCode) {
      return NextResponse.json(
        { success: false, message: 'Please enter your School Invite Code.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 1. Resolve Target School by invite_code / school_code
    let { data: school, error: schoolErr } = await supabase
      .from('schools')
      .select('*')
      .ilike('invite_code', cleanSchoolCode)
      .maybeSingle();

    if (schoolErr || !school) {
      // Fallback check against potential school_code column if schema variations exist
      const { data: schoolFallback } = await supabase
        .from('schools')
        .select('*')
        .or(`invite_code.ilike.${cleanSchoolCode}`)
        .maybeSingle();

      school = schoolFallback;
    }

    if (!school) {
      return NextResponse.json(
        { success: false, message: 'Invalid School Invite Code. Check with your school administrator.' },
        { status: 404 }
      );
    }

    // 1b. Enforce Founder Access Control & Term Expiry Checks (skip for demo school AEGIS-2026)
    const registryMap = await getSchoolAccessRegistry(supabase);
    const access = resolveSchoolAccess(school, registryMap);

    // Attach resolved access status properties to school object
    school.access_status = access.status;
    school.plan_label = access.planLabel;
    school.access_expires_at = access.expiresAt;

    if (!access.canAccess) {
      if (access.status === 'PENDING_APPROVAL') {
        return NextResponse.json(
          {
            success: false,
            accessBlocked: true,
            accessStatus: 'PENDING_APPROVAL',
            schoolName: school.name,
            inviteCode: school.invite_code,
            message: 'Awaiting Access Verification: Your institution’s 1-Term Free Pilot is awaiting Founder activation. Please verify your registration via WhatsApp.',
          },
          { status: 403 }
        );
      }

      if (access.status === 'TERM_EXPIRED') {
        return NextResponse.json(
          {
            success: false,
            accessBlocked: true,
            accessStatus: 'TERM_EXPIRED',
            schoolName: school.name,
            inviteCode: school.invite_code,
            message: 'Academic Term Concluded: Portal access for this academic term has concluded. Please contact the administrator or request renewal on WhatsApp.',
          },
          { status: 403 }
        );
      }
    }

    // 2. Handle STUDENT / PARENT Login
    if (type === 'student') {
      const cleanReg = (regNumber || '').trim().toUpperCase();
      const cleanPin = (pin || '').trim();

      if (!cleanReg || !cleanPin) {
        return NextResponse.json(
          { success: false, message: 'Please provide both Student Registration Number and 4-digit PIN.' },
          { status: 400 }
        );
      }

      // Query students strictly scoped to resolved school.id
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', school.id)
        .ilike('reg_number', cleanReg)
        .eq('access_pin', cleanPin)
        .maybeSingle();

      if (studentErr || !student) {
        return NextResponse.json(
          { success: false, message: 'Invalid registration number or PIN for this school.' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        role: 'student',
        school,
        student,
      });
    }

    // 3. Handle STAFF / ADMIN / TEACHER Login
    if (type === 'staff') {
      const cleanUser = (identifier || '').trim().toLowerCase();
      const cleanPass = (password || '').trim();

      if (!cleanUser || !cleanPass) {
        return NextResponse.json(
          { success: false, message: 'Please provide both Username / Staff ID and Password.' },
          { status: 400 }
        );
      }

      // Check database first so actual staff rows (with their true id, email, full_name, role) take precedence
      // Build safe orFilter for staff table (username, email, staff_id_code)
      const slashedUser = cleanUser.includes('_') ? cleanUser.replace(/_/g, '/') : cleanUser;
      const underscoredUser = cleanUser.includes('/') ? cleanUser.replace(/\//g, '_') : cleanUser;
      const orFilter = [
        `username.ilike.${cleanUser}`,
        `email.ilike.${cleanUser}`,
        `staff_id_code.ilike.${cleanUser}`,
        slashedUser !== cleanUser ? `staff_id_code.ilike.${slashedUser}` : null,
        underscoredUser !== cleanUser ? `username.ilike.${underscoredUser}` : null,
      ].filter(Boolean).join(',');

      const { data: staffMember, error: staffErr } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', school.id)
        .or(orFilter)
        .eq('password_hash', cleanPass)
        .maybeSingle();

      if (staffMember) {
        if (staffMember.status === 'revoked') {
          return NextResponse.json(
            { success: false, message: 'Account access has been revoked by administration.' },
            { status: 403 }
          );
        }

        const assignedRole = staffMember.role === 'admin' ? 'admin' : 'teacher';

        return NextResponse.json({
          success: true,
          role: assignedRole,
          school,
          staff: staffMember,
        });
      }

      // Master Super-Admin fallback check (only if no custom database staff matched)
      if (cleanUser === 'admin' && (cleanPass === 'admin123' || cleanPass === 'admin')) {
        return NextResponse.json({
          success: true,
          role: 'admin',
          school,
          staff: {
            id: `usr-admin-${school.id.slice(0, 8)}`,
            school_id: school.id,
            username: 'admin',
            full_name: 'School Administrator',
            role: 'admin',
            status: 'active',
          },
        });
      }

      return NextResponse.json(
        { success: false, message: 'Invalid username or password for this school.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Invalid login type specified.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Portal Login API error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Authentication server error.' },
      { status: 500 }
    );
  }
}
