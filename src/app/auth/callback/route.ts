import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

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
  const dest = next ? next : '/dashboard';
  return NextResponse.redirect(new URL(dest, url.origin));
}

