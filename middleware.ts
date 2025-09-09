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

  // If user is logged in and trying to access auth routes, redirect based on role
  if (session && isAuthRoute) {
    // Get user role to determine proper redirect
    const { data: user } = await supabase.auth.getUser();
    const isSuperAdmin =
      user?.user?.user_metadata?.is_super_admin === true ||
      user?.user?.user_metadata?.is_super_admin === 'true';

    if (isSuperAdmin) {
      url.pathname = '/super-admin';
      return NextResponse.redirect(url);
    }

    // For regular users, we'll let the root page handle the role-based redirect
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Protect super-admin routes - only super admins can access
  if (pathname.startsWith('/super-admin') && session) {
    const { data: user } = await supabase.auth.getUser();
    const isSuperAdmin =
      user?.user?.user_metadata?.is_super_admin === true ||
      user?.user?.user_metadata?.is_super_admin === 'true';

    if (!isSuperAdmin) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
