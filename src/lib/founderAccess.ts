import { SupabaseClient } from '@supabase/supabase-js';
import { School, SchoolAccessStatus, SchoolPlanLabel } from '@/types';

export const FOUNDER_ACCESS_REGISTRY_ID = '00000000-0000-0000-0000-000000000002';
export const MASTER_DEMO_SCHOOL_ID = '00000000-0000-0000-0000-000000000001';
export const MASTER_DEMO_INVITE = 'AEGIS-2026';

export interface SchoolAccessMeta {
  school_id: string;
  access_status: SchoolAccessStatus;
  plan_label: SchoolPlanLabel;
  access_expires_at: string | null;
  logo_url?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  updated_at?: string;
}

/**
 * Fetch all school access control meta records from the Supabase registry row
 */
export async function getSchoolAccessRegistry(supabase: SupabaseClient): Promise<Record<string, SchoolAccessMeta>> {
  try {
    const { data, error } = await supabase
      .from('fee_structures')
      .select('line_items')
      .eq('id', FOUNDER_ACCESS_REGISTRY_ID)
      .maybeSingle();

    if (error || !data || !Array.isArray(data.line_items)) {
      return {};
    }

    const map: Record<string, SchoolAccessMeta> = {};
    for (const item of data.line_items) {
      if (item && item.school_id) {
        map[item.school_id] = {
          school_id: item.school_id,
          access_status: (item.access_status as SchoolAccessStatus) || 'PENDING_APPROVAL',
          plan_label: (item.plan_label as SchoolPlanLabel) || 'FREE_PILOT_TERM',
          access_expires_at: item.access_expires_at || null,
          logo_url: item.logo_url || null,
          bank_name: item.bank_name || null,
          account_number: item.account_number || null,
          account_name: item.account_name || null,
          updated_at: item.updated_at,
        };
      }
    }
    return map;
  } catch (err) {
    console.warn('Error reading school access registry:', err);
    return {};
  }
}

/**
 * Save or update a school's access control status in the persistent registry row
 */
export async function saveSchoolAccessMeta(
  supabase: SupabaseClient,
  schoolId: string,
  updates: Partial<SchoolAccessMeta>
): Promise<SchoolAccessMeta> {
  const currentRegistry = await getSchoolAccessRegistry(supabase);

  const existing = currentRegistry[schoolId] || {
    school_id: schoolId,
    access_status: 'PENDING_APPROVAL',
    plan_label: 'FREE_PILOT_TERM',
    access_expires_at: null,
  };

  const updated: SchoolAccessMeta = {
    ...existing,
    ...updates,
    school_id: schoolId,
    updated_at: new Date().toISOString(),
  };

  currentRegistry[schoolId] = updated;

  const lineItems = Object.values(currentRegistry);

  const payload = {
    id: FOUNDER_ACCESS_REGISTRY_ID,
    class_id: 'cls-creche',
    class_name: 'AEGIS_ACCESS_REG',
    term: 'FOUNDER_CTRL',
    session: '2025/2026',
    line_items: lineItems,
    total_amount: 0,
    published: true,
    published_at: new Date().toISOString(),
    school_id: MASTER_DEMO_SCHOOL_ID,
  };

  const { error } = await supabase.from('fee_structures').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('Failed to persist school access registry:', error);
  }

  return updated;
}

/**
 * Enriches a School object with access status from database columns or access registry
 */
export function resolveSchoolAccess(
  school: School,
  registryMap?: Record<string, SchoolAccessMeta>
): {
  isMasterDemo: boolean;
  status: SchoolAccessStatus;
  planLabel: SchoolPlanLabel;
  expiresAt: string | null;
  logoUrl: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  isExpired: boolean;
  canAccess: boolean;
} {
  const isMasterDemo =
    school.id === MASTER_DEMO_SCHOOL_ID ||
    (school.invite_code || '').trim().toUpperCase() === MASTER_DEMO_INVITE;

  if (isMasterDemo) {
    return {
      isMasterDemo: true,
      status: 'ACTIVE',
      planLabel: 'ACTIVE_TERM',
      expiresAt: null,
      logoUrl: school.logo_url || school.logoUrl || null,
      bankName: school.bankName || school.bank_name || 'First Bank of Nigeria',
      accountNumber: school.accountNumber || school.account_number || '0123456789',
      accountName: school.accountName || school.account_name || 'Aegis Academy Nigeria',
      isExpired: false,
      canAccess: true,
    };
  }

  const meta = registryMap ? registryMap[school.id] : undefined;

  const rawStatus = school.access_status || meta?.access_status || 'PENDING_APPROVAL';
  const planLabel = school.plan_label || meta?.plan_label || 'FREE_PILOT_TERM';
  const expiresAt = school.access_expires_at !== undefined ? school.access_expires_at : (meta?.access_expires_at || null);
  const logoUrl = school.logo_url || school.logoUrl || meta?.logo_url || null;
  const bankName = school.bankName || school.bank_name || meta?.bank_name || null;
  const accountNumber = school.accountNumber || school.account_number || meta?.account_number || null;
  const accountName = school.accountName || school.account_name || meta?.account_name || null;

  let isExpired = false;
  if (rawStatus === 'TERM_EXPIRED') {
    isExpired = true;
  } else if (expiresAt) {
    const expiryTime = new Date(expiresAt).getTime();
    if (!isNaN(expiryTime) && Date.now() > expiryTime) {
      isExpired = true;
    }
  }

  const effectiveStatus: SchoolAccessStatus = isExpired ? 'TERM_EXPIRED' : rawStatus;
  const canAccess = effectiveStatus === 'ACTIVE';

  return {
    isMasterDemo: false,
    status: effectiveStatus,
    planLabel,
    expiresAt,
    logoUrl,
    bankName,
    accountNumber,
    accountName,
    isExpired,
    canAccess,
  };
}
