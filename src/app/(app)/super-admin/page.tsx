<<<<<<< HEAD
'use client';
import { Building2, Users, Settings, Plus, Eye } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

type Organization = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  member_count?: number;
};

type SuperAdminStats = {
  total_organizations: number;
  total_users: number;
  active_members: number;
};

export default function SuperAdminDashboard() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    setMounted(true);
    loadSuperAdminData();
  }, [supabase]);

  async function loadSuperAdminData() {
    setLoading(true);
    setError(null);

    try {
      // First check if user is super admin
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.href = '/login';
        return;
      }

      console.log('Super Admin Check:', {
        userId: session.user.id,
        email: session.user.email,
        metadata: session.user.user_metadata,
        is_super_admin: session.user.user_metadata?.is_super_admin,
        type: typeof session.user.user_metadata?.is_super_admin,
      });

      const isSuperAdminUser =
        session.user.user_metadata?.is_super_admin === true ||
        session.user.user_metadata?.is_super_admin === 'true';
      setIsSuperAdmin(isSuperAdminUser);

      if (!isSuperAdminUser) {
        setError('Access denied. Super admin privileges required.');
        setLoading(false);
        return;
      }

      // Load organizations with member and bill counts
      console.log('Loading organizations...');
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select(
          `
          id,
          name,
          slug,
          created_at
        `
        )
        .order('created_at', { ascending: false });

      console.log('Organizations query result:', { orgsData, orgsError });
      if (orgsError) throw orgsError;

      // Get member counts for each org
      const orgsWithCounts = await Promise.all(
        orgsData.map(async (org) => {
          const memberResult = await supabase
            .from('org_members')
            .select('id', { count: 'exact' })
            .eq('org_id', org.id)
            .eq('status', 'active');

          return {
            ...org,
            member_count: memberResult.count || 0,
          };
        })
      );

      setOrganizations(orgsWithCounts);

      // Load overall stats
      const [totalOrgs, totalUsers, activeMembers] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact' }),
        supabase.auth.admin.listUsers(),
        supabase
          .from('org_members')
          .select('id', { count: 'exact' })
          .eq('status', 'active'),
      ]);

      setStats({
        total_organizations: totalOrgs.count || 0,
        total_users: totalUsers.data.users.length,
        active_members: activeMembers.count || 0,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load super admin data'
      );
    } finally {
      setLoading(false);
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isSuperAdmin === false && !loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Access Denied
          </h1>
          <p className="text-neutral-600">
            Super admin privileges required to access this area.
          </p>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:underline mt-4 inline-block"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading || isSuperAdmin === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading super admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-neutral-600 mb-4">{error}</p>
          <button
            onClick={loadSuperAdminData}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
          <p className="text-neutral-600">
            Manage all organizations and system-wide settings
          </p>
        </div>
        <Link
          href="/super-admin/users"
          className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700"
        >
          <Users className="h-4 w-4" />
          Manage Users
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Organizations Card - Scrolls to organizations table */}
          <button
            onClick={() =>
              document
                .getElementById('organizations-table')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
            className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/40 transition-colors">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Organizations
                </p>
                <p className="text-xl font-semibold group-hover:text-blue-600 transition-colors">
                  {stats.total_organizations}
                </p>
              </div>
            </div>
          </button>

          {/* Users Card - Links to user management */}
          <Link
            href="/super-admin/users"
            className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer text-left group block"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/40 transition-colors">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Total Users
                </p>
                <p className="text-xl font-semibold group-hover:text-green-600 transition-colors">
                  {stats.total_users}
                </p>
              </div>
            </div>
          </Link>

          {/* Active Members Card - Scrolls to organizations table */}
          <button
            onClick={() =>
              document
                .getElementById('organizations-table')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
            className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/40 transition-colors">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Active Members
                </p>
                <p className="text-xl font-semibold group-hover:text-purple-600 transition-colors">
                  {stats.active_members}
                </p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Organizations Table */}
      <div
        id="organizations-table"
        className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
      >
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">All Organizations</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Manage and monitor all organizations in the system
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <th className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-neutral-100">
                  Organization
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-neutral-100">
                  Slug
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-neutral-100">
                  Members
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-neutral-100">
                  Created
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-neutral-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {organizations.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-neutral-500"
                  >
                    No organizations found
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr
                    key={org.id}
                    className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {org.name}
                        </p>
                        <p className="text-xs text-neutral-500 font-mono">
                          {org.id}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md text-xs font-mono">
                        {org.slug || 'No slug'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {org.member_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {new Date(org.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/super-admin/organizations/${org.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/40"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Link>
                        <Link
                          href={`/super-admin/organizations/${org.id}/settings`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/40"
                        >
                          <Settings className="h-3 w-3" />
                          Settings
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
=======
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
>>>>>>> origin/beta
        </div>
      </div>
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/beta
