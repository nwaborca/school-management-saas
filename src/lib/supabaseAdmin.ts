import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Returns a privileged Supabase client for secure server-side execution.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security when operating
 * within verified server API routes, falling back to anon key if service key is unset.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  const keyToUse = serviceKey || anonKey;

  adminClient = createClient(url, keyToUse, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

export const supabaseAdmin = getSupabaseAdmin();
