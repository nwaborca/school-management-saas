import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  getSchoolAccessRegistry,
  saveSchoolAccessMeta,
  resolveSchoolAccess,
  MASTER_DEMO_SCHOOL_ID,
  MASTER_DEMO_INVITE,
} from '@/lib/founderAccess';
import { School, SchoolAccessStatus, SchoolPlanLabel } from '@/types';
import { checkRateLimit, recordRateLimitAttempt, clearRateLimit } from '@/lib/security';
import { normalizeEnabledModules } from '@/lib/modules';

function verifyFounderPassword(password: string): boolean {
  const masterPassword = (process.env.FOUNDER_PASSWORD || 'jesusislord').trim();
  const provided = (password || '').trim();
  return provided === masterPassword;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, founderPassword, schoolId, customExpiresAt } = body;

    // Rate Limiting Check (max 8 failed attempts per 10 minutes per IP)
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown-ip';
    const rateLimitKey = `founder:${clientIp}`;

    const limitStatus = checkRateLimit(rateLimitKey, 8, 600000);
    if (!limitStatus.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many attempts on Founder Console. Please wait ${limitStatus.retryAfterSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    // 1. Authenticate Founder Master Password
    if (!verifyFounderPassword(founderPassword)) {
      recordRateLimitAttempt(rateLimitKey);
      return NextResponse.json(
        { success: false, message: 'Invalid Founder Master Access Password.' },
        { status: 401 }
      );
    }

    clearRateLimit(rateLimitKey);

    const supabase = getSupabaseAdmin();

    // ACTION: 'list' - Return all registered schools with statistics
    if (action === 'list') {
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (schoolsError) {
        return NextResponse.json(
          { success: false, message: `Failed to fetch schools: ${schoolsError.message}` },
          { status: 500 }
        );
      }

      const registryMap = await getSchoolAccessRegistry(supabase);

      // Fetch student counts and staff counts grouped by school_id
      const { data: studentsData } = await supabase.from('students').select('school_id');
      const { data: staffData } = await supabase.from('staff').select('school_id');

      const studentCountMap: Record<string, number> = {};
      (studentsData || []).forEach((row: any) => {
        if (row.school_id) {
          studentCountMap[row.school_id] = (studentCountMap[row.school_id] || 0) + 1;
        }
      });

      const staffCountMap: Record<string, number> = {};
      (staffData || []).forEach((row: any) => {
        if (row.school_id) {
          staffCountMap[row.school_id] = (staffCountMap[row.school_id] || 0) + 1;
        }
      });

      const schools = (schoolsData || []).map((s: any) => {
        const access = resolveSchoolAccess(s as School, registryMap);
        return {
          id: s.id,
          name: s.name,
          invite_code: s.invite_code,
          latitude: s.latitude,
          longitude: s.longitude,
          geofence_radius_meters: s.geofence_radius_meters,
          created_at: s.created_at,
          access_status: access.status,
          plan_label: access.planLabel,
          access_expires_at: access.expiresAt,
          is_expired: access.isExpired,
          is_master_demo: access.isMasterDemo,
          enabled_modules: normalizeEnabledModules(s.enabled_modules),
          plan_tier: s.plan_tier || 'SHIELD',
          termly_fee_ngn: typeof s.termly_fee_ngn === 'number' ? s.termly_fee_ngn : 75000,
          subscription_status: s.subscription_status || 'ACTIVE',
          student_count: studentCountMap[s.id] || 0,
          teacher_count: staffCountMap[s.id] || 0,
        };
      });

      return NextResponse.json({
        success: true,
        schools,
      });
    }

    // ACTION: 'approve_free_pilot' (+120 Days Free Pilot)
    if (action === 'approve_free_pilot') {
      if (!schoolId) {
        return NextResponse.json({ success: false, message: 'schoolId is required.' }, { status: 400 });
      }

      if (schoolId === MASTER_DEMO_SCHOOL_ID) {
        return NextResponse.json({ success: false, message: 'Master Demo School is permanently active.' }, { status: 400 });
      }

      const expiresDate = customExpiresAt
        ? new Date(customExpiresAt)
        : new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
      const access_expires_at = expiresDate.toISOString();

      const updatedMeta = await saveSchoolAccessMeta(supabase, schoolId, {
        access_status: 'ACTIVE',
        plan_label: 'FREE_PILOT_TERM',
        access_expires_at,
      });

      // Also attempt updating schools table directly if columns exist
      await supabase
        .from('schools')
        .update({
          access_status: 'ACTIVE',
          plan_label: 'FREE_PILOT_TERM',
          access_expires_at,
        })
        .eq('id', schoolId);

      return NextResponse.json({
        success: true,
        message: 'Free Pilot Term approved and activated for +120 days.',
        meta: updatedMeta,
      });
    }

    // ACTION: 'renew_paid_term' (+120 Days Paid Term)
    if (action === 'renew_paid_term') {
      if (!schoolId) {
        return NextResponse.json({ success: false, message: 'schoolId is required.' }, { status: 400 });
      }

      if (schoolId === MASTER_DEMO_SCHOOL_ID) {
        return NextResponse.json({ success: false, message: 'Master Demo School is permanently active.' }, { status: 400 });
      }

      const registryMap = await getSchoolAccessRegistry(supabase);
      const currentMeta = registryMap[schoolId];
      let baseTime = Date.now();

      // If current expiry is in the future, extend from that future date
      if (currentMeta?.access_expires_at) {
        const curExp = new Date(currentMeta.access_expires_at).getTime();
        if (!isNaN(curExp) && curExp > Date.now()) {
          baseTime = curExp;
        }
      }

      const expiresDate = customExpiresAt
        ? new Date(customExpiresAt)
        : new Date(baseTime + 120 * 24 * 60 * 60 * 1000);
      const access_expires_at = expiresDate.toISOString();

      const updatedMeta = await saveSchoolAccessMeta(supabase, schoolId, {
        access_status: 'ACTIVE',
        plan_label: 'ACTIVE_TERM',
        access_expires_at,
      });

      await supabase
        .from('schools')
        .update({
          access_status: 'ACTIVE',
          plan_label: 'ACTIVE_TERM',
          access_expires_at,
        })
        .eq('id', schoolId);

      return NextResponse.json({
        success: true,
        message: 'Paid Term renewed and extended for +120 days.',
        meta: updatedMeta,
      });
    }

    // ACTION: 'expire_now' (Immediately terminate/lock term)
    if (action === 'expire_now') {
      if (!schoolId) {
        return NextResponse.json({ success: false, message: 'schoolId is required.' }, { status: 400 });
      }

      if (schoolId === MASTER_DEMO_SCHOOL_ID) {
        return NextResponse.json({ success: false, message: 'Master Demo School cannot be locked.' }, { status: 400 });
      }

      const updatedMeta = await saveSchoolAccessMeta(supabase, schoolId, {
        access_status: 'TERM_EXPIRED',
        access_expires_at: new Date(Date.now() - 1000).toISOString(),
      });

      await supabase
        .from('schools')
        .update({
          access_status: 'TERM_EXPIRED',
        })
        .eq('id', schoolId);

      return NextResponse.json({
        success: true,
        message: 'School portal access has been locked and marked TERM_EXPIRED.',
        meta: updatedMeta,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action specified.' }, { status: 400 });
  } catch (err: any) {
    console.error('Founder manage schools error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error occurred in Founder management API.' },
      { status: 500 }
    );
  }
}
