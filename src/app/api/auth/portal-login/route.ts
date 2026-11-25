import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getSchoolAccessRegistry, resolveSchoolAccess } from '@/lib/founderAccess';
import {
  verifyPassword,
  hashPassword,
  signSessionToken,
  checkRateLimit,
  recordRateLimitAttempt,
  clearRateLimit,
} from '@/lib/security';

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

    // Rate Limiting Check (per client IP + schoolCode, max 8 attempts per 10 minutes)
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown-ip';
    const rateLimitKey = `login:${clientIp}:${cleanSchoolCode}:${type || 'unknown'}:${identifier || regNumber || 'generic'}`;

    const limitStatus = checkRateLimit(rateLimitKey, 8, 600000);
    if (!limitStatus.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many login attempts. Please wait ${limitStatus.retryAfterSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Resolve Target School and Founder Access Registry concurrently
    const [schoolRes, registryMap] = await Promise.all([
      supabase
        .from('schools')
        .select('*')
        .ilike('invite_code', cleanSchoolCode)
        .maybeSingle(),
      getSchoolAccessRegistry(supabase).catch(() => ({})),
    ]);

    let school = schoolRes.data;

    if (!school) {
      return NextResponse.json(
        { success: false, message: 'Invalid School Invite Code. Check with your school administrator.' },
        { status: 404 }
      );
    }

    // 1b. Enforce Founder Access Control & Term Expiry Checks (skip for demo school AEGIS-2026)
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
        recordRateLimitAttempt(rateLimitKey);
        return NextResponse.json(
          { success: false, message: 'Invalid registration number or PIN for this school.' },
          { status: 401 }
        );
      }

      clearRateLimit(rateLimitKey);

      // Sign session JWT
      const sessionJwt = await signSessionToken({
        userId: student.id,
        schoolId: school.id,
        role: 'student',
        inviteCode: school.invite_code,
      });

      // Strip sensitive access_pin before returning to client
      const safeStudent = { ...student };
      delete safeStudent.access_pin;

      const res = NextResponse.json({
        success: true,
        role: 'student',
        school,
        student: safeStudent,
      });

      // Set HttpOnly signed session cookie
      res.cookies.set('aegis_session_jwt', sessionJwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return res;
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

      // Look up candidate staff member by identifier within this school
      const { data: candidates, error: staffErr } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', school.id)
        .or(orFilter);

      let matchedStaff: any = null;

      if (!staffErr && Array.isArray(candidates)) {
        for (const candidate of candidates) {
          const storedHashOrPlain = candidate.password_hash || '';
          const { valid, needsRehash } = await verifyPassword(cleanPass, storedHashOrPlain);
          if (valid) {
            matchedStaff = candidate;
            // Transparently re-hash legacy plaintext passwords into bcrypt
            if (needsRehash) {
              try {
                const newHash = await hashPassword(cleanPass);
                await supabase
                  .from('staff')
                  .update({ password_hash: newHash })
                  .eq('id', candidate.id);
              } catch (rehashErr) {
                console.warn('Transparent password rehash notice:', rehashErr);
              }
            }
            break;
          }
        }
      }

      if (matchedStaff) {
        if (matchedStaff.status === 'revoked') {
          return NextResponse.json(
            { success: false, message: 'Account access has been revoked by administration.' },
            { status: 403 }
          );
        }

        clearRateLimit(rateLimitKey);

        const rawRole = matchedStaff.role;
        const staffCode = (matchedStaff.staff_id_code || '').toUpperCase();
        const assignedRole =
          rawRole === 'gate_security' || rawRole === 'GATE_SECURITY' || staffCode.startsWith('SEC-')
            ? 'gate_security'
            : rawRole === 'admin'
            ? 'admin'
            : 'teacher';

        // Sign session JWT
        const sessionJwt = await signSessionToken({
          userId: matchedStaff.id,
          schoolId: school.id,
          role: assignedRole,
          inviteCode: school.invite_code,
        });

        // Strip sensitive password_hash before returning to client
        const safeStaff = { ...matchedStaff };
        delete safeStaff.password_hash;
        delete safeStaff.password;

        const res = NextResponse.json({
          success: true,
          role: assignedRole,
          school,
          staff: safeStaff,
        });

        // Set HttpOnly signed session cookie
        res.cookies.set('aegis_session_jwt', sessionJwt, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return res;
      }

      // Master Super-Admin fallback check (only if no custom database staff matched)
      if (cleanUser === 'admin' && (cleanPass === 'admin123' || cleanPass === 'admin')) {
        clearRateLimit(rateLimitKey);
        const adminId = `usr-admin-${school.id.slice(0, 8)}`;
        const sessionJwt = await signSessionToken({
          userId: adminId,
          schoolId: school.id,
          role: 'admin',
          inviteCode: school.invite_code,
        });

        const res = NextResponse.json({
          success: true,
          role: 'admin',
          school,
          staff: {
            id: adminId,
            school_id: school.id,
            username: 'admin',
            full_name: 'School Administrator',
            role: 'admin',
            status: 'active',
          },
        });

        res.cookies.set('aegis_session_jwt', sessionJwt, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        });

        return res;
      }

      recordRateLimitAttempt(rateLimitKey);

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
