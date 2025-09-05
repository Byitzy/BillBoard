import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  // This will refresh the session if needed, enabling RLS on SSR/Route Handlers
  await supabase.auth.getSession();
  return res;
}

export const config = {
  matcher: [
    // Run on all app routes to keep session fresh
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'
  ]
};

