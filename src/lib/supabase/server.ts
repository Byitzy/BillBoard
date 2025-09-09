import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { APIError } from '@/types/api';
import type { Database } from '@/types/supabase';

export async function getServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

export function getServiceClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new APIError(
      'Missing Supabase service role configuration. Please check your environment variables.',
      'MISSING_SERVICE_CONFIG',
      500
    );
  }

  return createClient<Database>(url, key);
}

export async function getUserFromRequest(req: NextRequest) {
  // Prefer Authorization: Bearer <access_token> if provided by client
  const authHeader =
    req.headers.get('authorization') || req.headers.get('Authorization');
  const jwt = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.split(' ')[1]
    : null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (jwt && url && anon) {
    const asUser = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data, error } = await asUser.auth.getUser();
    if (!error && data.user) return data.user;
  }
  // Fallback to cookie-based session
  const supabase = await getServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
