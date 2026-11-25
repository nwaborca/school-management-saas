import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, recordRateLimitAttempt, clearRateLimit } from '@/lib/security';
import { normalizeEnabledModules } from '@/lib/modules';
import { PlanTier, SubscriptionStatus } from '@/types';

function verifyFounderPassword(password: string): boolean {
  const masterPassword = (process.env.FOUNDER_PASSWORD || 'jesusislord').trim();
  const provided = (password || '').trim();
  return provided === masterPassword;
}

const VALID_TIERS: PlanTier[] = ['CORE', 'OPERATIONS', 'SHIELD', 'CUSTOM'];
const VALID_STATUSES: SubscriptionStatus[] = ['ACTIVE', 'TRIAL', 'SUSPENDED'];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await context.params;
    const body = await req.json();
    const { founderPassword, enabled_modules, plan_tier, termly_fee_ngn, subscription_status } = body;

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

    if (!verifyFounderPassword(founderPassword)) {
      recordRateLimitAttempt(rateLimitKey);
      return NextResponse.json(
        { success: false, message: 'Invalid Founder Master Access Password.' },
        { status: 401 }
      );
    }

    clearRateLimit(rateLimitKey);

    if (!schoolId) {
      return NextResponse.json({ success: false, message: 'schoolId is required.' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};

    if (enabled_modules && typeof enabled_modules === 'object') {
      updatePayload.enabled_modules = normalizeEnabledModules(enabled_modules);
    }
    if (plan_tier && VALID_TIERS.includes(plan_tier)) {
      updatePayload.plan_tier = plan_tier;
    }
    if (typeof termly_fee_ngn === 'number' && !Number.isNaN(termly_fee_ngn) && termly_fee_ngn >= 0) {
      updatePayload.termly_fee_ngn = Math.round(termly_fee_ngn);
    }
    if (subscription_status && VALID_STATUSES.includes(subscription_status)) {
      updatePayload.subscription_status = subscription_status;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ success: false, message: 'No valid fields to update.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('schools')
      .update(updatePayload)
      .eq('id', schoolId)
      .select('id, name, invite_code, enabled_modules, plan_tier, termly_fee_ngn, subscription_status')
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: `Failed to update school modules: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      school: {
        ...data,
        enabled_modules: normalizeEnabledModules(data.enabled_modules),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Unexpected server error' },
      { status: 500 }
    );
  }
}
