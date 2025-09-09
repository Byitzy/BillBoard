import { getServerClient, getServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SuperAdminStats from '@/components/super-admin/SuperAdminStats';

export default async function SuperAdminDashboard() {
  const supabase = getServerClient();
  
  // Get session and check super admin status
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.log('No session or session error:', sessionError);
    redirect('/login');
  }

  const isSuperAdmin = session.user.user_metadata?.is_super_admin === true || 
                      session.user.user_metadata?.is_super_admin === 'true';

  console.log('Super Admin Check:', {
    userId: session.user.id,
    email: session.user.email,
    metadata: session.user.user_metadata,
    is_super_admin: session.user.user_metadata?.is_super_admin,
    type: typeof session.user.user_metadata?.is_super_admin,
    isSuperAdmin
  });

  if (!isSuperAdmin) {
    console.log('User is not a super admin, redirecting to dashboard');
    redirect('/dashboard');
  }

  // Create service role client for admin operations
  const serviceSupabase = getServiceClient();

  // Fetch statistics
  const [
    { count: totalOrgs },
    { count: totalUsers },
    { count: activeMembers }
  ] = await Promise.all([
    serviceSupabase.from('organizations').select('*', { count: 'exact', head: true }),
    serviceSupabase.from('auth.users').select('*', { count: 'exact', head: true }),
    serviceSupabase.from('org_members').select('*', { count: 'exact', head: true })
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Super Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          System-wide overview and management
        </p>
      </div>

      <SuperAdminStats 
        totalOrgs={totalOrgs || 0}
        totalUsers={totalUsers || 0} 
        activeMembers={activeMembers || 0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a
              href="/super-admin/users"
              className="block p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors"
            >
              <div className="font-medium">Manage Users</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Create and manage system users</div>
            </a>
            <a
              href="/super-admin/organizations"
              className="block p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
            >
              <div className="font-medium">Manage Organizations</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">View and manage organizations</div>
            </a>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Database Status</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Auth Service</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Storage Service</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs">
                Healthy
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}