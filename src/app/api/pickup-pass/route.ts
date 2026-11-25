import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')?.trim();
    const otp = req.nextUrl.searchParams.get('otp')?.trim();
    const schoolId = req.nextUrl.searchParams.get('schoolId')?.trim();

    if (!token && !(otp && schoolId)) {
      return NextResponse.json({ success: false, message: 'No pass token or OTP provided' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch pass strictly by qr_token or (school_id + otp_code)
    let query = supabase
      .from('pickup_passes')
      .select('id, school_id, student_id, pass_type, delegate_name, otp_code, qr_token, status, expires_at, picked_up_at, gate_released_at');

    if (token) {
      query = query.eq('qr_token', token);
    } else if (otp && schoolId) {
      query = query.eq('school_id', schoolId).eq('otp_code', otp);
    }

    const { data: pass, error: passErr } = await query.maybeSingle();

    if (passErr || !pass) {
      return NextResponse.json({ success: false, message: 'Invalid or non-existent pick-up pass' }, { status: 404 });
    }

    // 2. Fetch student minimal display fields only (NO grades, NO fees, NO pins)
    const { data: student } = await supabase
      .from('students')
      .select('full_name, class_grade')
      .eq('id', pass.student_id)
      .maybeSingle();

    // 3. Fetch school name
    const { data: school } = await supabase
      .from('schools')
      .select('name, logo_url')
      .eq('id', pass.school_id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      pass: {
        id: pass.id,
        school_id: pass.school_id,
        student_id: pass.student_id,
        pass_type: pass.pass_type,
        delegate_name: pass.delegate_name,
        otp_code: pass.otp_code,
        qr_token: pass.qr_token,
        status: pass.status,
        expires_at: pass.expires_at,
        picked_up_at: pass.picked_up_at,
        gate_released_at: pass.gate_released_at,
        student_name: student?.full_name || 'Enrolled Student',
        student_class: student?.class_grade || 'Primary / Secondary',
        school_name: school?.name || 'Aegis Academy',
        logo_url: school?.logo_url || null,
      },
    });
  } catch (err: any) {
    console.error('Public pass token query error:', err);
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
