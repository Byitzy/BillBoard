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
};

type Organization = {
  id: string;
  name: string;
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
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.email || !formData.orgId) return;

    setCreating(true);
    setError(null);

    try {
      console.log('Creating user with data:', formData);
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          role: formData.role,
          orgId: formData.orgId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          Create User
        </button>
      </div>

      {error && (
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
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
        </div>
      </div>
    </div>
  );
}