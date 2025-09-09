'use client';
import { ArrowLeft, Plus, Users, Shield } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

type User = {
  id: string;
  email?: string;
  created_at: string;
  email_confirmed_at?: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
    is_super_admin?: boolean;
  };
};

type Organization = {
  id: string;
  name: string;
  slug: string | null;
};

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user',
    organizationId: '',
  });

  const supabase = getSupabaseClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function checkAuthAndLoadData() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setError('Authentication required');
          return;
        }

        const userIsSuperAdmin =
          session.user.user_metadata?.is_super_admin === 'true' ||
          session.user.user_metadata?.is_super_admin === true;

        setIsSuperAdmin(userIsSuperAdmin);

        if (!userIsSuperAdmin) {
          setError('Super admin privileges required');
          return;
        }

        await loadData();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndLoadData();
  }, [supabase]);

  async function loadData() {
    try {
      // Fetch users - this would need a proper API endpoint
      const usersResponse = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      
      if (usersResponse.ok) {
        const { users: usersData } = await usersResponse.json();
        setUsers(usersData || []);
      }

      // Fetch organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name');
      if (orgsError) throw orgsError;
      setOrganizations(orgsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      // Create user via API
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
          organizationId: formData.organizationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const { user: newUser } = await response.json();
      console.log('User creation result:', { newUser });

      // Reset form and reload data
      setFormData({
        email: '',
        password: '',
        fullName: '',
        role: 'user',
        organizationId: '',
      });
      setShowCreateForm(false);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  }

  if (!mounted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading || isSuperAdmin === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/super-admin"
          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">User Management</h1>
          </div>
          <p className="text-neutral-600">Create and manage system users</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Create User Form */}
      {mounted && showCreateForm && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Create New User</h2>
          <form onSubmit={createUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Organization (Optional)
              </label>
              <select
                value={formData.organizationId}
                onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800"
              >
                <option value="">Select organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">All System Users</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Total users: {users.length}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {user.user_metadata?.full_name || user.email || 'Unknown'}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.user_metadata?.is_super_admin ? (
                        <Shield className="h-4 w-4 text-purple-500" />
                      ) : null}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.user_metadata?.is_super_admin
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                      }`}>
                        {user.user_metadata?.is_super_admin ? 'Super Admin' : user.user_metadata?.role || 'User'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.email_confirmed_at
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                    }`}>
                      {user.email_confirmed_at ? 'Confirmed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {new Date(user.created_at).toLocaleDateString()}
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