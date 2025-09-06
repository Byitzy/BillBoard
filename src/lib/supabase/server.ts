import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

export function getServerClient() {
  return createRouteHandlerClient({ cookies });
}

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Missing Supabase service role env');
  return createClient(url, key);
}

export async function getUserFromRequest(req: NextRequest) {
  // Prefer Authorization: Bearer <access_token> if provided by client
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const jwt = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.split(' ')[1]
    : null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (jwt && url && anon) {
    const asUser = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data, error } = await asUser.auth.getUser();
    if (!error && data.user) return data.user;
  }
  // Fallback to cookie-based session
  const supabase = getServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
