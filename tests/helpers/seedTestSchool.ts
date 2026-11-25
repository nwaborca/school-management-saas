import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { hashPassword } from '@/lib/security';

function getSupabase() {
  const envText = fs.readFileSync('.env.local', 'utf8');
  const env: Record<string, string> = {};
  envText.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) {
      let val = m[2] || '';
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      env[m[1]] = val;
    }
  });

  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key);
}

export const TEST_SCHOOL_ID = '99999999-9999-9999-9999-999999999999';
export const TEST_INVITE_CODE = 'AEGIS-TEST-999';
export const TEST_PASSWORD = 'password123';

export const TEST_NURSERY_CLASS_ID = '99999999-0000-0000-0000-000000000001';
export const TEST_JSS_CLASS_ID = '99999999-0000-0000-0000-000000000002';

export const TEST_ADMIN_ID = '99999999-1111-0000-0000-000000000001';
export const TEST_TEACHER_ID = '99999999-2222-0000-0000-000000000001';
export const TEST_GATE_ID = '99999999-3333-0000-0000-000000000001';

export const TEST_STUDENT_EY_ID = '99999999-4444-0000-0000-000000000001';
export const TEST_STUDENT_JSS_ID = '99999999-4444-0000-0000-000000000002';

export async function seedTestSchool() {
  const supabase = getSupabase();
  const passwordHash = await hashPassword(TEST_PASSWORD);

  // Clean any previous test run leftovers first
  await cleanupTestSchool();

  // 1. Insert School
  const { error: schoolErr } = await supabase.from('schools').insert({
    id: TEST_SCHOOL_ID,
    name: 'Playwright Stress Test Academy',
    invite_code: TEST_INVITE_CODE,
    latitude: 6.5244,
    longitude: 3.3792,
    geofence_radius_meters: 150,
    access_status: 'ACTIVE',
    plan_label: 'ENTERPRISE_PILOT',
    bank_name: 'Guaranty Trust Bank',
    account_number: '0123456789',
    account_name: 'Playwright Stress Test Academy',
  });
  if (schoolErr) throw new Error(`Failed to seed school: ${schoolErr.message}`);

  // 2. Insert Classes
  const { error: classErr } = await supabase.from('classes').insert([
    {
      id: TEST_NURSERY_CLASS_ID,
      school_id: TEST_SCHOOL_ID,
      name: 'Nursery 1',
      level: 'Nursery 1',
      session: '2025/2026',
      stage: 'early_childhood',
      student_count: 1,
    },
    {
      id: TEST_JSS_CLASS_ID,
      school_id: TEST_SCHOOL_ID,
      name: 'JSS 1',
      level: 'JSS 1',
      session: '2025/2026',
      stage: 'junior_secondary',
      student_count: 1,
    },
  ]);
  if (classErr) throw new Error(`Failed to seed classes: ${classErr.message}`);

  // 3. Insert Staff: Admin, Teacher, Gate Security
  const { error: staffErr } = await supabase.from('staff').insert([
    {
      id: TEST_ADMIN_ID,
      school_id: TEST_SCHOOL_ID,
      full_name: 'Test Administrator',
      username: 'test_admin_999',
      email: 'admin999@test.com',
      phone: '+2348000000010',
      staff_id_code: 'ADM-999',
      role: 'admin',
      password_hash: passwordHash,
      status: 'active',
      assigned_subject_ids: [],
    },
    {
      id: TEST_TEACHER_ID,
      school_id: TEST_SCHOOL_ID,
      full_name: 'Test Teacher',
      username: 'test_teacher_999',
      email: 'teacher999@test.com',
      phone: '+2348000000020',
      staff_id_code: 'TCH-999',
      role: 'teacher',
      form_class_id: TEST_NURSERY_CLASS_ID,
      assigned_subject_ids: ['subj-ec-lang', 'sub-eng', 'subj-j-eng'],
      password_hash: passwordHash,
      status: 'active',
    },
    {
      id: TEST_GATE_ID,
      school_id: TEST_SCHOOL_ID,
      full_name: 'Test Gate Security',
      username: 'test_gate_999',
      email: 'gate999@test.com',
      phone: '+2348000000030',
      staff_id_code: 'SEC-999',
      role: 'teacher',
      password_hash: passwordHash,
      status: 'active',
      assigned_subject_ids: [],
    },
  ]);
  if (staffErr) throw new Error(`Failed to seed staff: ${staffErr.message}`);

  // 4. Insert Students: 1 Nursery, 1 JSS
  const { error: stuErr } = await supabase.from('students').insert([
    {
      id: TEST_STUDENT_EY_ID,
      school_id: TEST_SCHOOL_ID,
      full_name: 'Chidera Test Pupil',
      reg_number: 'TEST-EY-001',
      access_pin: '1234',
      class_id: TEST_NURSERY_CLASS_ID,
      class_grade: 'Nursery 1',
      session: '2025/2026',
      parent_name: 'Chief Test Parent',
      parent_phone: '+2348000000001',
      payment_status: 'paid',
      fee_paid: true,
      ndpa_consent_granted: true,
    },
    {
      id: TEST_STUDENT_JSS_ID,
      school_id: TEST_SCHOOL_ID,
      full_name: 'Emeka Test Junior',
      reg_number: 'TEST-JSS-002',
      access_pin: '5678',
      class_id: TEST_JSS_CLASS_ID,
      class_grade: 'JSS 1',
      session: '2025/2026',
      parent_name: 'Mrs Test Parent',
      parent_phone: '+2348000000002',
      payment_status: 'paid',
      fee_paid: true,
      ndpa_consent_granted: true,
    },
  ]);
  if (stuErr) throw new Error(`Failed to seed students: ${stuErr.message}`);

  return { success: true };
}

export async function cleanupTestSchool() {
  const supabase = getSupabase();
  try {
    // Cascade delete via public.schools ON DELETE CASCADE
    await supabase.from('term_results').delete().eq('school_id', TEST_SCHOOL_ID);
    await supabase.from('staff_attendance').delete().eq('school_id', TEST_SCHOOL_ID);
    await supabase.from('pickup_passes').delete().eq('school_id', TEST_SCHOOL_ID);
    await supabase.from('students').delete().eq('school_id', TEST_SCHOOL_ID);
    await supabase.from('staff').delete().eq('school_id', TEST_SCHOOL_ID);
    await supabase.from('classes').delete().eq('school_id', TEST_SCHOOL_ID);
    await supabase.from('schools').delete().eq('id', TEST_SCHOOL_ID);
  } catch (err) {
    console.warn('Cleanup warning:', err);
  }
}
