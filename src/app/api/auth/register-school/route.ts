import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { INITIAL_CLASSES } from '@/lib/mockData';
import { AcademicClass } from '@/types';
import { saveSchoolAccessMeta } from '@/lib/founderAccess';

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

function generateRandomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateUUID(): string {
  return `${generateRandomHex(8)}-${generateRandomHex(4)}-4${generateRandomHex(3)}-8${generateRandomHex(3)}-${generateRandomHex(12)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      schoolName,
      adminFullName,
      email,
      phone,
      password,
      address,
      latitude,
      longitude,
      logoUrl,
      bankName,
      accountNumber,
      accountName,
    } = body;

    const cleanSchoolName = (schoolName || '').trim();
    const cleanAdminName = (adminFullName || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanPassword = (password || '').trim();
    const cleanLogoUrl = typeof logoUrl === 'string' && logoUrl.startsWith('data:image/') ? logoUrl : null;
    const cleanBankName = typeof bankName === 'string' && bankName.trim() ? bankName.trim() : null;
    const cleanAccountNumber = typeof accountNumber === 'string' && accountNumber.trim() ? accountNumber.trim() : null;
    const cleanAccountName = typeof accountName === 'string' && accountName.trim() ? accountName.trim() : null;

    if (!cleanSchoolName || !cleanAdminName || !cleanEmail || !cleanPhone || !cleanPassword) {
      return NextResponse.json(
        { success: false, message: 'All required school and administrator fields must be filled.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const schoolId = generateUUID();

    // 1. Generate unique 4-character invite code (e.g., AEGIS-XXXX)
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let inviteCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }
      inviteCode = `AEGIS-${code}`;

      const { data } = await supabase.from('schools').select('id').eq('invite_code', inviteCode).maybeSingle();
      if (!data) isUnique = true;
    }

    if (!isUnique) {
      inviteCode = `AEGIS-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const newSchool = {
      id: schoolId,
      name: cleanSchoolName,
      invite_code: inviteCode,
      latitude: latitude ?? 6.5244,
      longitude: longitude ?? 3.3792,
      geofence_radius_meters: 150,
      logo_url: cleanLogoUrl,
      bank_name: cleanBankName,
      account_number: cleanAccountNumber,
      account_name: cleanAccountName,
      access_status: 'PENDING_APPROVAL',
      plan_label: 'FREE_PILOT_TERM',
      access_expires_at: null,
      created_at: new Date().toISOString(),
    };

    // 2. Insert School Record into Supabase (gracefully omitting extra columns if schema hasn't migrated)
    const baseSchoolPayload = {
      id: schoolId,
      name: cleanSchoolName,
      invite_code: inviteCode,
      latitude: latitude ?? 6.5244,
      longitude: longitude ?? 3.3792,
      geofence_radius_meters: 150,
      created_at: newSchool.created_at,
    };

    // Attempt insert with bank details and logo columns first, fallback gracefully if columns do not exist
    let schoolInsertErr: any = null;
    const { error: fullSchoolError } = await supabase.from('schools').insert(newSchool);
    if (fullSchoolError) {
      // Try without bank columns if not migrated yet
      const withoutBank = { ...newSchool };
      delete (withoutBank as any).bank_name;
      delete (withoutBank as any).account_number;
      delete (withoutBank as any).account_name;
      const { error: withoutBankErr } = await supabase.from('schools').insert(withoutBank);
      if (withoutBankErr) {
        // Try without logo_url
        delete (withoutBank as any).logo_url;
        const { error: withoutLogoErr } = await supabase.from('schools').insert(withoutBank);
        if (withoutLogoErr) {
          const { error: baseErr } = await supabase.from('schools').insert(baseSchoolPayload);
          if (baseErr) {
            schoolInsertErr = baseErr;
          }
        }
      }
    }

    if (schoolInsertErr) {
      return NextResponse.json(
        { success: false, message: `Failed to create school record: ${schoolInsertErr.message}` },
        { status: 500 }
      );
    }

    // Persist access control meta, white-label logo, and bank account in the high-availability registry
    await saveSchoolAccessMeta(supabase, schoolId, {
      access_status: 'PENDING_APPROVAL',
      plan_label: 'FREE_PILOT_TERM',
      access_expires_at: null,
      logo_url: cleanLogoUrl,
      bank_name: cleanBankName,
      account_number: cleanAccountNumber,
      account_name: cleanAccountName,
    });

    // 3. Seed 33-tier classes for this school
    const classesPayload = INITIAL_CLASSES.map((c: AcademicClass) => ({
      id: `${schoolId}-${c.id}`,
      school_id: schoolId,
      name: c.name,
      session: c.session,
      level: c.level,
      arm: c.arm || null,
      stage: c.stage,
      student_count: 0,
    }));

    const { error: classesError } = await supabase.from('classes').insert(classesPayload);
    if (classesError) {
      console.warn('Note: Class seeding warning:', classesError.message);
    }

    // 4. Provision unique Proprietor ADMIN Staff Record
    // Prevent staff_id_code and username collisions with school-scoped identifiers
    const codeSuffix = inviteCode.includes('-') ? inviteCode.split('-')[1].toLowerCase() : inviteCode.toLowerCase();
    const emailPrefix = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
    const uniqueUsername = `admin_${codeSuffix}_${emailPrefix}`;
    const uniqueStaffIdCode = `ADM-${codeSuffix.toUpperCase()}-001`;
    const adminStaffId = generateUUID();

    const adminStaff = {
      id: adminStaffId,
      school_id: schoolId,
      staff_id_code: uniqueStaffIdCode,
      full_name: cleanAdminName,
      phone: cleanPhone,
      email: cleanEmail,
      username: uniqueUsername,
      password_hash: cleanPassword,
      role: 'admin',
      status: 'active',
      assigned_subject_ids: [],
      session_token: generateUUID(),
      created_at: new Date().toISOString(),
    };

    const { error: staffError } = await supabase.from('staff').insert(adminStaff);
    if (staffError) {
      // Rollback school if admin creation failed
      await supabase.from('schools').delete().eq('id', schoolId);
      return NextResponse.json(
        {
          success: false,
          message: `Failed to provision Proprietor administrator account: ${staffError.message}. School creation rolled back.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      school: newSchool,
      inviteCode: newSchool.invite_code,
      staff: adminStaff,
      adminUsername: uniqueUsername,
      adminEmail: cleanEmail,
      adminStaffIdCode: uniqueStaffIdCode,
    });
  } catch (err: any) {
    console.error('Register school API error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error occurred during school registration.' },
      { status: 500 }
    );
  }
}
