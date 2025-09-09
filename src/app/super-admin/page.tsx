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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              Super Admin Dashboard
            </h1>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage all organizations and system-wide settings
          </p>
        </div>
        <Link
          href="/super-admin/users"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Users className="h-5 w-5" />
          Manage Users
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Organizations Card - Scrolls to organizations table */}
          <button
            onClick={() =>
              document
                .getElementById('organizations-table')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl border border-blue-200 dark:border-blue-800 p-6 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900 dark:hover:to-blue-800 transition-all duration-200 cursor-pointer text-left group hover:shadow-lg hover:scale-105 transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                  Organizations
                </p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors">
                  {stats.total_organizations}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl group-hover:from-blue-600 group-hover:to-blue-700 transition-all">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </button>

          {/* Users Card - Links to user management */}
          <Link
            href="/super-admin/users"
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-xl border border-green-200 dark:border-green-800 p-6 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900 dark:hover:to-green-800 transition-all duration-200 cursor-pointer text-left group hover:shadow-lg hover:scale-105 transform block"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100 group-hover:text-green-700 dark:group-hover:text-green-200 transition-colors">
                  {stats.total_users}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl group-hover:from-green-600 group-hover:to-green-700 transition-all">
                <Users className="h-6 w-6 text-white" />
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
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-xl border border-purple-200 dark:border-purple-800 p-6 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900 dark:hover:to-purple-800 transition-all duration-200 cursor-pointer text-left group hover:shadow-lg hover:scale-105 transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
                  Active Members
                </p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 group-hover:text-purple-700 dark:group-hover:text-purple-200 transition-colors">
                  {stats.active_members}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl group-hover:from-purple-600 group-hover:to-purple-700 transition-all">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Organizations Table */}
      <div
        id="organizations-table"
        className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm"
      >
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            All Organizations
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Manage and monitor all organizations in the system
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <th className="px-6 py-4 text-left font-semibold text-sm text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                  Organization
                </th>
                <th className="px-6 py-4 text-left font-semibold text-sm text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                  Slug
                </th>
                <th className="px-6 py-4 text-left font-semibold text-sm text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                  Members
                </th>
                <th className="px-6 py-4 text-left font-semibold text-sm text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                  Created
                </th>
                <th className="px-6 py-4 text-left font-semibold text-sm text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {organizations.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400"
                  >
                    <div className="flex flex-col items-center">
                      <Building2 className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                      <p className="text-lg font-medium mb-1">
                        No organizations found
                      </p>
                      <p className="text-sm">
                        Organizations will appear here once created
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                organizations.map((org, index) => (
                  <tr
                    key={org.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {org.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {org.name}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate">
                            {org.id.substring(0, 8)}...
                            {org.id.substring(org.id.length - 4)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                        {org.slug || 'No slug'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-neutral-400 mr-2" />
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {org.member_count}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {new Date(org.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <Link
                          href={`/super-admin/organizations/${org.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors duration-150"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Link>
                        <Link
                          href={`/super-admin/organizations/${org.id}/settings`}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-neutral-50 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors duration-150"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Settings
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
