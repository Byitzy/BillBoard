'use client';
import { ArrowLeft, Plus, Users, Mail, Shield } from 'lucide-react';
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
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'admin' as 'admin' | 'super_admin',
    organizationId: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const supabase = getSupabaseClient();

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Check super admin status
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

      // Load all users
      const {
        data: { users },
        error: usersError,
      } = await supabase.auth.admin.listUsers();
      if (usersError) throw usersError;
      setUsers(users);

      // Load organizations for the form
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name');
      if (orgsError) throw orgsError;
      setOrganizations(orgsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      // Create user
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
          user_metadata: {
            full_name: formData.fullName,
            role: formData.role,
            is_super_admin: formData.role === 'super_admin',
          },
        });

      if (createError) throw createError;

      // If creating an org admin, add them to the organization
      if (formData.role === 'admin' && formData.organizationId) {
        const { error: memberError } = await supabase
          .from('org_members')
          .insert({
            org_id: formData.organizationId,
            user_id: newUser.user.id,
            role: 'admin',
            status: 'active',
          });

        if (memberError) throw memberError;
      }

      // If creating a super admin, add them to all organizations
      if (formData.role === 'super_admin') {
        for (const org of organizations) {
          await supabase.from('org_members').insert({
            org_id: org.id,
            user_id: newUser.user.id,
            role: 'admin',
            status: 'active',
          });
        }
      }

      // Reset form and reload data
      setFormData({
        email: '',
        password: '',
        fullName: '',
        role: 'admin',
        organizationId: '',
      });
      setShowCreateForm(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setFormLoading(false);
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
          <p className="text-neutral-600">Super admin privileges required.</p>
          <Link
            href="/super-admin"
            className="text-blue-600 hover:underline mt-4 inline-block"
          >
            Return to Super Admin Dashboard
          </Link>
        </div>
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
          <h1 className="text-2xl font-bold">User Management</h1>
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
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Must include upper, lower, number, special char"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  User Type
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'admin' | 'super_admin',
                    })
                  }
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="admin">Organization Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

            {formData.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Organization
                </label>
                <select
                  value={formData.organizationId}
                  onChange={(e) =>
                    setFormData({ ...formData, organizationId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} {org.slug && `(${org.slug})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-neutral-500"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          {user.user_metadata?.is_super_admin ? (
                            <Shield className="h-4 w-4 text-purple-600" />
                          ) : (
                            <Users className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.user_metadata?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {user.email || 'No email'}
                          </p>
                          <p className="text-xs text-neutral-400 font-mono">
                            {user.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.user_metadata?.is_super_admin ? (
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-md text-xs font-medium">
                            Super Admin
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs">
                            {user.user_metadata?.role || 'User'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-md text-xs ${
                          user.email_confirmed_at
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                        }`}
                      >
                        {user.email_confirmed_at ? 'Confirmed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                      {new Date(user.created_at).toLocaleDateString()}
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
