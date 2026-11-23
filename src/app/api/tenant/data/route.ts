import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { verifySessionToken } from '@/lib/security';

const ALLOWED_TABLES = [
  'students',
  'staff',
  'classes',
  'term_results',
  'fee_structures',
  'receipts',
  'staff_attendance',
  'pickup_passes',
  'schools',
  'announcements',
  'class_dismissal_audits',
] as const;

type AllowedTable = typeof ALLOWED_TABLES[number];

// Explicit safe columns for staff - NEVER return password or password_hash
const SAFE_STAFF_COLUMNS = [
  'id',
  'school_id',
  'staff_id_code',
  'full_name',
  'phone',
  'email',
  'username',
  'role',
  'status',
  'assigned_subject_ids',
  'form_class_id',
  'session_token',
  'created_at',
].join(',');

// Explicit safe columns for students - NEVER return access_pin in bulk queries
const SAFE_STUDENT_COLUMNS = [
  'id',
  'school_id',
  'reg_number',
  'full_name',
  'class_id',
  'class_grade',
  'session',
  'parent_name',
  'parent_phone',
  'gpa',
  'attendance_percentage',
  'fee_paid',
  'payment_status',
  'tuition_status',
  'enrolled_by_role',
  'enrolled_by_name',
  'enrollment_date',
  'ndpa_consent_granted',
  'consent_timestamp',
  'created_at',
].join(',');

/**
 * GET: Fetches tenant datasets strictly filtered by school_id
 */
export async function GET(req: NextRequest) {
  try {
    const sessionJwt = req.cookies.get('aegis_session_jwt')?.value;
    const session = sessionJwt ? await verifySessionToken(sessionJwt) : null;

    // Support fallback activeSchoolId header/query parameter if session cookie is still hydrating
    const searchParams = req.nextUrl.searchParams;
    const requestedSchoolId = searchParams.get('schoolId') || req.headers.get('x-school-id') || null;

    const resolvedSchoolId = session?.schoolId || requestedSchoolId;

    if (!resolvedSchoolId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Valid school session required.' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch tenant-scoped collections concurrently via privileged server client
    const [
      schoolRes,
      studentsRes,
      staffRes,
      classesRes,
      resultsRes,
      feesRes,
      receiptsRes,
      attendanceRes,
      passesRes,
      announcementsRes,
    ] = await Promise.all([
      supabase.from('schools').select('*').eq('id', resolvedSchoolId).maybeSingle(),
      supabase.from('students').select(SAFE_STUDENT_COLUMNS).eq('school_id', resolvedSchoolId),
      supabase.from('staff').select(SAFE_STAFF_COLUMNS).eq('school_id', resolvedSchoolId),
      supabase.from('classes').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('term_results').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('fee_structures').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('receipts').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('staff_attendance').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('pickup_passes').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('announcements').select('*').eq('school_id', resolvedSchoolId),
    ]);

    return NextResponse.json({
      success: true,
      schoolId: resolvedSchoolId,
      data: {
        school: schoolRes.data || null,
        students: studentsRes.data || [],
        staff: staffRes.data || [],
        classes: classesRes.data || [],
        termResults: resultsRes.data || [],
        feeStructures: feesRes.data || [],
        receipts: receiptsRes.data || [],
        staffAttendance: attendanceRes.data || [],
        pickupPasses: passesRes.data || [],
        announcements: announcementsRes.data || [],
      },
    });
  } catch (err: any) {
    console.error('Tenant Data Gateway GET error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error loading tenant data.' },
      { status: 500 }
    );
  }
}

/**
 * POST: Secure mutation gateway (insert, upsert, update, delete)
 */
export async function POST(req: NextRequest) {
  try {
    const sessionJwt = req.cookies.get('aegis_session_jwt')?.value;
    const session = sessionJwt ? await verifySessionToken(sessionJwt) : null;

    const body = await req.json();
    const { action, table, payload, filter, targetSchoolId } = body;

    const resolvedSchoolId = session?.schoolId || targetSchoolId;

    if (!resolvedSchoolId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Active school identity required.' },
        { status: 401 }
      );
    }

    // Role-based authorization: student and gate_security roles have restricted write permissions
    const userRole = session?.role;
    if (userRole === 'student' || userRole === 'gate_security') {
      const allowedForRestricted: AllowedTable[] = [
        'staff_attendance',
        'pickup_passes',
        'receipts',
      ];
      if (!allowedForRestricted.includes(table)) {
        return NextResponse.json(
          { success: false, message: `Access denied. Role '${userRole}' cannot modify '${table}'.` },
          { status: 403 }
        );
      }
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json(
        { success: false, message: `Table '${table}' is not supported by tenant data gateway.` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. INSERT / UPSERT
    if (action === 'insert' || action === 'upsert') {
      if (!payload) {
        return NextResponse.json({ success: false, message: 'Payload is required.' }, { status: 400 });
      }

      // Enforce school_id on single object or array
      const sanitizedPayload = Array.isArray(payload)
        ? payload.map((item) => ({ ...item, school_id: resolvedSchoolId }))
        : { ...payload, school_id: resolvedSchoolId };

      let query = supabase.from(table);
      const res = action === 'upsert'
        ? await query.upsert(sanitizedPayload)
        : await query.insert(sanitizedPayload);

      if (res.error) {
        return NextResponse.json({ success: false, message: res.error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, count: Array.isArray(payload) ? payload.length : 1 });
    }

    // 2. UPDATE
    if (action === 'update') {
      if (!payload || !filter || typeof filter !== 'object') {
        return NextResponse.json(
          { success: false, message: 'Payload and filter are required for update.' },
          { status: 400 }
        );
      }

      // Never update or overwrite another tenant's rows
      let query = supabase.from(table).update(payload).eq('school_id', resolvedSchoolId);

      for (const [key, val] of Object.entries(filter)) {
        if (key !== 'school_id' && val !== undefined) {
          query = query.eq(key, val);
        }
      }

      const res = await query;
      if (res.error) {
        return NextResponse.json({ success: false, message: res.error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // 3. DELETE
    if (action === 'delete') {
      if (!filter || typeof filter !== 'object') {
        return NextResponse.json({ success: false, message: 'Filter is required for delete.' }, { status: 400 });
      }

      let query = supabase.from(table).delete().eq('school_id', resolvedSchoolId);

      for (const [key, val] of Object.entries(filter)) {
        if (key !== 'school_id' && val !== undefined) {
          query = query.eq(key, val);
        }
      }

      const res = await query;
      if (res.error) {
        return NextResponse.json({ success: false, message: res.error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: `Unknown action '${action}'.` }, { status: 400 });
  } catch (err: any) {
    console.error('Tenant Data Gateway POST error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error processing tenant mutation.' },
      { status: 500 }
    );
  }
}
