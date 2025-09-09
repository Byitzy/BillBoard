import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
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
