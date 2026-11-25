import { EnabledModules, ModuleKey, PlanTier, School } from '@/types';

export const DEFAULT_ENABLED_MODULES: EnabledModules = {
  auto_grading_results: true,
  nursery_commentary: true,
  fee_tracking: true,
  staff_qr_attendance: true,
  safe_pickup_gate: true,
};

export interface ModuleMetadata {
  key: ModuleKey;
  label: string;
  description: string;
}

export const MODULE_METADATA: ModuleMetadata[] = [
  {
    key: 'auto_grading_results',
    label: 'Auto-Grading & Results',
    description: 'Automatic WAEC/numeric grading, report cards & parent result checker',
  },
  {
    key: 'nursery_commentary',
    label: 'Nursery Commentary',
    description: 'Early Years / Montessori 5-domain developmental commentary grading',
  },
  {
    key: 'fee_tracking',
    label: 'Fee Tracking & Ledger',
    description: 'Termly fee ledger, receipts, debtor list & school bank account details',
  },
  {
    key: 'staff_qr_attendance',
    label: 'Staff QR Attendance',
    description: 'Campus GPS geofencing, QR poster generator & teacher clock-in/out logs',
  },
  {
    key: 'safe_pickup_gate',
    label: 'Safe Pick-Up & Gate',
    description: 'Parent/student 5-hour Safe Pick-Up OTP generator & /gate security checkpoint',
  },
];

export interface TierPreset {
  tier: Exclude<PlanTier, 'CUSTOM'>;
  name: string;
  priceNgn: number;
  modules: EnabledModules;
}

export const TIER_PRESETS: Record<Exclude<PlanTier, 'CUSTOM'>, TierPreset> = {
  CORE: {
    tier: 'CORE',
    name: 'Aegis Core',
    priceNgn: 35000,
    modules: {
      auto_grading_results: true,
      nursery_commentary: true,
      fee_tracking: true,
      staff_qr_attendance: false,
      safe_pickup_gate: false,
    },
  },
  OPERATIONS: {
    tier: 'OPERATIONS',
    name: 'Aegis Operations',
    priceNgn: 55000,
    modules: {
      auto_grading_results: true,
      nursery_commentary: true,
      fee_tracking: true,
      staff_qr_attendance: true,
      safe_pickup_gate: false,
    },
  },
  SHIELD: {
    tier: 'SHIELD',
    name: 'Aegis Shield',
    priceNgn: 75000,
    modules: {
      auto_grading_results: true,
      nursery_commentary: true,
      fee_tracking: true,
      staff_qr_attendance: true,
      safe_pickup_gate: true,
    },
  },
};

export function normalizeEnabledModules(raw?: Partial<EnabledModules> | null): EnabledModules {
  return {
    auto_grading_results: raw?.auto_grading_results ?? true,
    nursery_commentary: raw?.nursery_commentary ?? true,
    fee_tracking: raw?.fee_tracking ?? true,
    staff_qr_attendance: raw?.staff_qr_attendance ?? true,
    safe_pickup_gate: raw?.safe_pickup_gate ?? true,
  };
}

export function isModuleEnabled(school: Pick<School, 'enabled_modules'> | null | undefined, key: ModuleKey): boolean {
  if (!school || !school.enabled_modules) return true;
  return school.enabled_modules[key] !== false;
}

export function getModuleLabel(key: ModuleKey): string {
  return MODULE_METADATA.find((m) => m.key === key)?.label || key;
}
