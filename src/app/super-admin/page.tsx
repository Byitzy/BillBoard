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
  bill_count?: number;
};

type SuperAdminStats = {
  total_organizations: number;
  total_users: number;
  active_members: number;
  total_bills: number;
};

export default function SuperAdminDashboard() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    loadSuperAdminData();
  }, []);

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
        session.user.user_metadata?.is_super_admin === true;
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
          const [memberResult, billResult] = await Promise.all([
            supabase
              .from('org_members')
              .select('id', { count: 'exact' })
              .eq('org_id', org.id)
              .eq('status', 'active'),
            supabase
              .from('bills')
              .select('id', { count: 'exact' })
              .eq('org_id', org.id),
          ]);

          return {
            ...org,
            member_count: memberResult.count || 0,
            bill_count: billResult.count || 0,
          };
        })
      );

      setOrganizations(orgsWithCounts);

      // Load overall stats
      const [totalOrgs, totalUsers, activeMembers, totalBills] =
        await Promise.all([
          supabase.from('organizations').select('id', { count: 'exact' }),
          supabase.auth.admin.listUsers(),
          supabase
            .from('org_members')
            .select('id', { count: 'exact' })
            .eq('status', 'active'),
          supabase.from('bills').select('id', { count: 'exact' }),
        ]);

      setStats({
        total_organizations: totalOrgs.count || 0,
        total_users: totalUsers.data.users.length,
        active_members: activeMembers.count || 0,
        total_bills: totalBills.count || 0,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load super admin data');
    } finally {
      setLoading(false);
    }
  }

  if (!isSuperAdmin && !loading) {
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

  if (loading) {
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
        <div className="flex gap-2">
          <Link
            href="/super-admin/users"
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700"
          >
            <Users className="h-4 w-4" />
            Manage Users
          </Link>
          <Link
            href="/super-admin/organizations/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Organization
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Organizations
                </p>
                <p className="text-xl font-semibold">
                  {stats.total_organizations}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Total Users
                </p>
                <p className="text-xl font-semibold">{stats.total_users}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Active Members
                </p>
                <p className="text-xl font-semibold">{stats.active_members}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Settings className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Total Bills
                </p>
                <p className="text-xl font-semibold">{stats.total_bills}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organizations Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
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
                  Bills
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
                    colSpan={6}
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
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {org.bill_count}
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
                          href={
                            `/super-admin/organizations/${org.id}/settings` as any
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700"
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
        </div>
      </div>
    </div>
  );
}
