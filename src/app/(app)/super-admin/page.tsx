'use client';
import { Building2, Users, Settings, Plus, Eye } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

type Organization = {
  id: string;
  name: string;
  slug: string | null;
  branding_prefix: string | null;
  theme: any;
  created_at: string;
};

type Stats = {
  totalOrgs: number;
  totalUsers: number;
  activeMembers: number;
};

export default function SuperAdminPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOrgs: 0,
    totalUsers: 0,
    activeMembers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch organizations
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });

        if (orgsError) {
          throw orgsError;
        }

        setOrganizations(orgsData || []);

        // Calculate basic stats
        setStats({
          totalOrgs: orgsData?.length || 0,
          totalUsers: 0, // This would need an API call to get user count
          activeMembers: 0, // This would need an API call to get member count
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-neutral-600 dark:text-neutral-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Super Admin Dashboard
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-2">
          System-wide overview and management
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/super-admin/organizations" className="group">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Total Organizations
                </p>
                <p className="text-3xl font-bold text-purple-600 group-hover:text-purple-700">
                  {stats.totalOrgs}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/super-admin/users" className="group">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors shadow-sm hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-blue-600 group-hover:text-blue-700">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </Link>

        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Active Members
              </p>
              <p className="text-3xl font-bold text-green-600">
                {stats.activeMembers}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Settings className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/super-admin/users"
            className="flex items-center gap-3 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors"
          >
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Plus className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium">Create New User</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Add users to the system
              </p>
            </div>
          </Link>

          <Link
            href="/super-admin/organizations"
            className="flex items-center gap-3 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
          >
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Eye className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">Manage Organizations</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                View and configure organizations
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold">Recent Organizations</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Latest organizations in the system
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Organization
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {organizations.slice(0, 5).map((org) => (
                <tr
                  key={org.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {org.name}
                      </div>
                      {org.slug && (
                        <div className="text-sm text-neutral-500 dark:text-neutral-400">
                          {org.slug}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/super-admin/organizations/${org.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View Details
                      </Link>
                      <span className="text-neutral-300 dark:text-neutral-600">
                        |
                      </span>
                      <Link
                        href={`/super-admin/organizations/${org.id}/settings`}
                        className="text-sm text-neutral-600 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                      >
                        Settings
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}