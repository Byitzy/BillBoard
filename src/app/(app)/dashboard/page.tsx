'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getUserRoleAndRedirectPath } from '@/lib/supabase/utils';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function redirectToRoleDashboard() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Get user role and determine appropriate dashboard
          const { role } = await getUserRoleAndRedirectPath(
            supabase,
            session.user.id
          );

          // Redirect to role-specific dashboard
          switch (role) {
            case 'super_admin':
              router.replace('/super-admin');
              break;
            case 'admin':
              router.replace('/dashboard/admin');
              break;
            case 'approver':
              router.replace('/dashboard/approver');
              break;
            case 'accountant':
              router.replace('/dashboard/accountant');
              break;
            case 'data_entry':
              router.replace('/dashboard/accountant'); // Data entry users see accountant dashboard
              break;
            case 'analyst':
              router.replace('/dashboard/analyst');
              break;
            case 'viewer':
              router.replace('/dashboard/viewer');
              break;
            case 'no_org':
              router.replace('/onboarding');
              break;
            default:
              // Default to admin dashboard for unknown roles
              router.replace('/dashboard/admin');
              break;
          }
        } else {
          // User is not logged in, redirect to login
          router.replace('/login');
        }
      } catch (error) {
        // On error, redirect to login for safety
        router.replace('/login');
      }
    }

    redirectToRoleDashboard();
  }, [router, supabase]);

  // Show loading spinner while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-neutral-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
