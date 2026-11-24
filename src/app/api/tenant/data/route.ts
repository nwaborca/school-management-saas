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

function allowedForRestrictedRole(table: string, allowedList: AllowedTable[]): boolean {
  return allowedList.includes(table as AllowedTable);
}

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
      dismissalsRes,
    ] = await Promise.all([
      supabase.from('schools').select('*').eq('id', resolvedSchoolId).maybeSingle(),
      supabase.from('students').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('staff').select(SAFE_STAFF_COLUMNS).eq('school_id', resolvedSchoolId),
      supabase.from('classes').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('term_results').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('fee_structures').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('receipts').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('staff_attendance').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('pickup_passes').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('announcements').select('*').eq('school_id', resolvedSchoolId),
      supabase.from('class_dismissal_audits').select('*').eq('school_id', resolvedSchoolId),
    ]);

    // Strip sensitive access_pin from student records in the list
    const sanitizedStudents = (studentsRes.data || []).map((s: any) => {
      const clean = { ...s };
      delete clean.access_pin;
      return clean;
    });

    return NextResponse.json({
      success: true,
      schoolId: resolvedSchoolId,
      data: {
        school: schoolRes.data || null,
        students: sanitizedStudents,
        staff: staffRes.data || [],
        classes: classesRes.data || [],
        termResults: resultsRes.data || [],
        feeStructures: feesRes.data || [],
        receipts: receiptsRes.data || [],
        staffAttendance: attendanceRes.data || [],
        pickupPasses: passesRes.data || [],
        announcements: announcementsRes.data || [],
        classDismissalAudits: dismissalsRes.data || [],
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
    const { action, table, payload, filter, targetSchoolId, onConflict } = body;

    const resolvedSchoolId = session?.schoolId || targetSchoolId;

    if (!resolvedSchoolId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Active school identity required.' },
        { status: 401 }
      );
    }

    // Role-based authorization: student, teacher, and gate_security roles have restricted write permissions
    const userRole = session?.role;
    if (userRole === 'student') {
      const allowedForStudent: AllowedTable[] = [
        'pickup_passes',
        'receipts',
      ];
      if (!allowedForRestrictedRole(table, allowedForStudent)) {
        return NextResponse.json(
          { success: false, message: `Access denied. Role 'student' cannot modify '${table}'.` },
          { status: 403 }
        );
      }
    } else if (userRole === 'gate_security') {
      const allowedForSecurity: AllowedTable[] = [
        'staff_attendance',
        'pickup_passes',
      ];
      if (!allowedForRestrictedRole(table, allowedForSecurity)) {
        return NextResponse.json(
          { success: false, message: `Access denied. Role 'gate_security' cannot modify '${table}'.` },
          { status: 403 }
        );
      }
    } else if (userRole === 'teacher') {
      const allowedForTeacher: AllowedTable[] = [
        'term_results',
        'staff_attendance',
        'pickup_passes',
        'class_dismissal_audits',
        'announcements',
      ];
      if (!allowedForRestrictedRole(table, allowedForTeacher)) {
        return NextResponse.json(
          { success: false, message: `Access denied. Role 'teacher' cannot modify '${table}'.` },
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

      // Safe UPSERT for term_results and tables with composite unique constraints
      if (action === 'upsert' && table === 'term_results' && !Array.isArray(sanitizedPayload)) {
        // First check if an existing row matches the unique constraint or provided id
        let existingRowQuery = supabase.from('term_results').select('id');
        if (sanitizedPayload.id) {
          existingRowQuery = existingRowQuery.eq('id', sanitizedPayload.id);
        } else if (
          sanitizedPayload.student_id &&
          sanitizedPayload.subject_id &&
          sanitizedPayload.term &&
          (sanitizedPayload.session || sanitizedPayload.academic_session)
        ) {
          existingRowQuery = existingRowQuery
            .eq('student_id', sanitizedPayload.student_id)
            .eq('subject_id', sanitizedPayload.subject_id)
            .eq('term', sanitizedPayload.term)
            .eq('session', sanitizedPayload.session || sanitizedPayload.academic_session);
        }

        const { data: existingRows } = await existingRowQuery.limit(1);
        if (existingRows && existingRows.length > 0) {
          const updateId = existingRows[0].id;
          const { id: _ignoredId, ...updateFields } = sanitizedPayload;
          const updateRes = await supabase.from('term_results').update(updateFields).eq('id', updateId);
          if (updateRes.error) {
            return NextResponse.json({ success: false, message: updateRes.error.message }, { status: 400 });
          }

          // If this is commentary, ensure remarks and grade weren't reset by trigger
          const remarksStr = typeof sanitizedPayload.remarks === 'string' ? sanitizedPayload.remarks : '';
          const isCommentary = remarksStr.startsWith('EY_DATA:') || sanitizedPayload.grade === 'A';
          if (isCommentary) {
            try {
              await supabase
                .from('term_results')
                .update({
                  remarks: sanitizedPayload.remarks,
                  grade: sanitizedPayload.grade || 'A',
                })
                .eq('id', updateId);
            } catch {}
          }

          return NextResponse.json({ success: true, count: 1 });
        }
      }

      let query = supabase.from(table);
      let res;
      if (action === 'upsert') {
        const resolvedConflict = onConflict || (table === 'term_results' ? 'student_id,subject_id,term,session' : undefined);
        res = resolvedConflict
          ? await query.upsert(sanitizedPayload, { onConflict: resolvedConflict })
          : await query.upsert(sanitizedPayload);
      } else {
        res = await query.insert(sanitizedPayload);
      }

      if (res.error) {
        return NextResponse.json({ success: false, message: res.error.message }, { status: 400 });
      }

      // If this is an early years or commentary term_results record, the database calculation trigger
      // (handle_result_grade_calculation) calculates 0 + 0 + 0 = 0 and forcibly overwrites remarks with 'Fail (F9)'.
      // We immediately patch remarks and grade without touching ca1/ca2/exam, bypassing the calculation trigger.
      if (table === 'term_results' && sanitizedPayload) {
        const remarksStr = typeof sanitizedPayload.remarks === 'string' ? sanitizedPayload.remarks : '';
        const isCommentary = remarksStr.startsWith('EY_DATA:') || sanitizedPayload.grade === 'A';
        if (isCommentary && sanitizedPayload.student_id && sanitizedPayload.subject_id) {
          try {
            await supabase
              .from('term_results')
              .update({
                remarks: sanitizedPayload.remarks,
                grade: sanitizedPayload.grade || 'A',
              })
              .eq('student_id', sanitizedPayload.student_id)
              .eq('subject_id', sanitizedPayload.subject_id)
              .eq('term', sanitizedPayload.term)
              .eq('session', sanitizedPayload.session || sanitizedPayload.academic_session);
          } catch (patchErr) {
            console.warn('Non-fatal term_results commentary patch warning:', patchErr);
          }
        }
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

      // Special handling for the 'schools' table which uses 'id' instead of 'school_id'
      if (table === 'schools') {
        let query = supabase.from('schools').update(payload).eq('id', resolvedSchoolId);
        for (const [key, val] of Object.entries(filter)) {
          if (key !== 'id' && key !== 'school_id' && val !== undefined) {
            query = query.eq(key, val);
          }
        }
        const res = await query;
        if (res.error) {
          return NextResponse.json({ success: false, message: res.error.message }, { status: 400 });
        }
        return NextResponse.json({ success: true });
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
