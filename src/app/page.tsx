'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getUserRoleAndRedirectPath } from '@/lib/supabase/utils';

export default function RootPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function checkAuthAndRedirect() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // User is logged in, get their role and redirect accordingly
          const { redirectPath } = await getUserRoleAndRedirectPath(
            supabase,
            session.user.id
          );
          router.replace(redirectPath as any);
        } else {
          // User is not logged in, redirect to login
          router.replace('/login');
        }
      } catch (error) {
        // On error, redirect to login for safety
        router.replace('/login');
      }
    }

    checkAuthAndRedirect();
  }, [router, supabase]);

  // Show loading spinner while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
