import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = new URL(req.url);
  const pathname = url.pathname;
  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/auth/');
  const isApi = pathname.startsWith('/api');
  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots');

  // Allow API routes to handle auth themselves (avoid redirects breaking fetch)
  if (!session && !isAuthRoute && !isPublicAsset && !isApi) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (session && isAuthRoute) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
