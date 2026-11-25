-- Modular Feature Flags & Founder Subscription Control System
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS enabled_modules JSONB NOT NULL DEFAULT '{
    "auto_grading_results": true,
    "nursery_commentary": true,
    "fee_tracking": true,
    "staff_qr_attendance": true,
    "safe_pickup_gate": true
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'SHIELD'
    CHECK (plan_tier IN ('CORE', 'OPERATIONS', 'SHIELD', 'CUSTOM')),
  ADD COLUMN IF NOT EXISTS termly_fee_ngn INTEGER NOT NULL DEFAULT 75000,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (subscription_status IN ('ACTIVE', 'TRIAL', 'SUSPENDED'));
