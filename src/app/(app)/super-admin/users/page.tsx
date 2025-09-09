<<<<<<< HEAD
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
=======
"use client";
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Plus, Trash2, Edit } from 'lucide-react';

type User = {
  id: string;
  email: string;
  user_metadata: {
    is_super_admin?: boolean | string;
    role?: string;
  };
  created_at: string;
>>>>>>> origin/beta
};

type Organization = {
  id: string;
  name: string;
<<<<<<< HEAD
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
  }, [supabase]);

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
        session.user.user_metadata?.is_super_admin === true ||
        session.user.user_metadata?.is_super_admin === 'true';
      setIsSuperAdmin(isSuperAdminUser);

      if (!isSuperAdminUser) {
        setError('Access denied. Super admin privileges required.');
        setLoading(false);
        return;
      }

      // Load all users via API
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load users');
      }

      const { users } = await response.json();
      setUsers(users);

      // Load organizations for the form
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name');
      if (orgsError) throw orgsError;
      setOrganizations(orgsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
=======
};

export default function SuperAdminUsersPage() {
  const supabase = getSupabaseClient();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'user' as 'user' | 'super_admin',
    orgId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Fetch users using the API route
      const usersResponse = await fetch('/api/admin/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }
      
      // Fetch organizations
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      
      setOrganizations(orgsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
>>>>>>> origin/beta
    } finally {
      setLoading(false);
    }
  }

<<<<<<< HEAD
  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      console.log('Creating user with data:', {
        email: formData.email,
        role: formData.role,
        is_super_admin: formData.role === 'super_admin',
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      // Create user via API
=======
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.email || !formData.orgId) return;

    setCreating(true);
    setError(null);

    try {
      console.log('Creating user with data:', formData);
      
>>>>>>> origin/beta
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
<<<<<<< HEAD
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
          organizationId: formData.organizationId,
=======
        },
        body: JSON.stringify({
          email: formData.email,
          role: formData.role,
          orgId: formData.orgId,
>>>>>>> origin/beta
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

<<<<<<< HEAD
      const { user: newUser } = await response.json();
      console.log('User creation result:', { newUser });

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
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
=======
      const newUser = await response.json();
      console.log('User created successfully:', newUser);

      // Reset form and close
      setFormData({ email: '', role: 'user', orgId: '' });
      setShowCreateForm(false);
      
      // Reload data to show the new user
      await loadData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      setError(error.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading users...</div>
>>>>>>> origin/beta
      </div>
    );
  }

  return (
    <div className="space-y-6">
<<<<<<< HEAD
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
=======
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage system users and their roles</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
>>>>>>> origin/beta
          Create User
        </button>
      </div>

      {error && (
<<<<<<< HEAD
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
=======
        <div className="p-4 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-medium mb-4">Create New User</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
                disabled={creating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'user' | 'super_admin' })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                disabled={creating}
              >
                <option value="user">Regular User</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Organization</label>
              <select
                value={formData.orgId}
                onChange={(e) => setFormData({ ...formData, orgId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
                disabled={creating}
              >
                <option value="">Select organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !formData.email || !formData.orgId}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ email: '', role: 'user', orgId: '' });
                  setError(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                disabled={creating}
>>>>>>> origin/beta
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

<<<<<<< HEAD
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
=======
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">All Users ({users.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => {
                  const isSuperAdmin = user.user_metadata?.is_super_admin === true || 
                                      user.user_metadata?.is_super_admin === 'true';
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4">
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-gray-500">{user.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isSuperAdmin 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {isSuperAdmin ? 'Super Admin' : 'User'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button 
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Edit user"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
