import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (_e) {
      // fall through to redirect regardless; Topbar will reflect state
    }
  }

  // Optional: support redirect back to original path via ?next=/somewhere
  const next = url.searchParams.get('next');

  // If there's a specific next path, use it, otherwise let root page handle role-based redirect
  const dest = next ? next : '/';
  return NextResponse.redirect(new URL(dest, url.origin));
}
