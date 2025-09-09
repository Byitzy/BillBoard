<<<<<<< HEAD
'use client';
import { ArrowLeft, Building2, Save, Trash2, Settings } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
=======
"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Trash2, Users, Building2, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
>>>>>>> origin/beta

type Organization = {
  id: string;
  name: string;
<<<<<<< HEAD
  slug: string | null;
  branding_prefix: string | null;
  theme: any;
  created_at: string;
};

export default function SuperAdminOrgSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    branding_prefix: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    setMounted(true);
    loadOrganization();
  }, [orgId]);

  async function loadOrganization() {
    setLoading(true);
    setError(null);

    try {
      // Check super admin status
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
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

      // Load organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);

      // Set form data
      setFormData({
        name: orgData.name || '',
        slug: orgData.slug || '',
        branding_prefix: orgData.branding_prefix || '',
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load organization'
      );
=======
  created_at: string;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  users: {
    email: string;
  };
};

type Stats = {
  bills: number;
  vendors: number;
  projects: number;
};

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  const supabase = getSupabaseClient();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats>({ bills: 0, vendors: 0, projects: 0 });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Fetch organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .eq('id', orgId)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        setError('Organization not found');
        return;
      }

      setOrganization(org);

      // Fetch members - temporarily disable to avoid type issues
      const membersData: any[] = [];
      const membersError = null;

      if (membersError) {
        console.error('Error fetching members:', membersError);
      } else {
        setMembers(membersData || []);
      }

      // Fetch statistics
      const [
        { count: billCount },
        { count: vendorCount },
        { count: projectCount }
      ] = await Promise.all([
        supabase.from('bills').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('org_id', orgId)
      ]);

      setStats({
        bills: billCount || 0,
        vendors: vendorCount || 0,
        projects: projectCount || 0
      });

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load organization data');
>>>>>>> origin/beta
    } finally {
      setLoading(false);
    }
  }

<<<<<<< HEAD
  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          slug: formData.slug || null,
          branding_prefix: formData.branding_prefix || null,
        })
        .eq('id', orgId);

      if (updateError) throw updateError;

      setSuccess('Organization settings updated successfully!');
      await loadOrganization(); // Reload data
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to update organization'
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrganization() {
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
=======
  async function handleDeleteOrganization() {
    if (!organization) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'DELETE',
>>>>>>> origin/beta
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete organization');
      }

<<<<<<< HEAD
      const { message } = await response.json();

      // Redirect to super admin dashboard after successful deletion
      router.push('/super-admin' as any);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete organization'
      );
=======
      // Success - redirect to organizations list
      router.push('/super-admin/organizations');
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      setError(error.message || 'Failed to delete organization');
>>>>>>> origin/beta
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

<<<<<<< HEAD
  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
=======
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading organization...</div>
>>>>>>> origin/beta
      </div>
    );
  }

<<<<<<< HEAD
  if (isSuperAdmin === false && !loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Access Denied
          </h1>
          <p className="text-neutral-600">Super admin privileges required.</p>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:underline mt-4 inline-block"
          >
            Return to Dashboard
=======
  if (error && !organization) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <Link
            href="/super-admin/organizations"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to Organizations
>>>>>>> origin/beta
          </Link>
        </div>
      </div>
    );
  }

<<<<<<< HEAD
  if (loading || isSuperAdmin === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="text-center py-8">
        <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
        <p className="text-neutral-600 mb-4">
          {error || 'Organization not found'}
        </p>
        <Link
          href="/super-admin"
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          Back to Super Admin
        </Link>
      </div>
    );
  }
=======
  const canDelete = stats.bills === 0 && stats.vendors === 0 && stats.projects === 0;
>>>>>>> origin/beta

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
<<<<<<< HEAD
          href={`/super-admin/organizations/${orgId}`}
          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">Organization Settings</h1>
          </div>
          <p className="text-sm text-neutral-500">
            Configure settings for {organization.name}
=======
          href="/super-admin/organizations"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Organization Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage {organization?.name}
>>>>>>> origin/beta
          </p>
        </div>
      </div>

<<<<<<< HEAD
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <p className="text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <h2 className="text-lg font-semibold mb-6">Basic Information</h2>

        <form onSubmit={saveSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="organization-url-slug"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Used for organization URLs. Leave empty for auto-generation.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Branding Prefix
            </label>
            <input
              type="text"
              value={formData.branding_prefix}
              onChange={(e) =>
                setFormData({ ...formData, branding_prefix: e.target.value })
              }
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ORG"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Short prefix used for bill numbers and other identifiers.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <Link
              href={`/super-admin/organizations/${orgId}`}
              className="inline-flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 px-4 py-2 rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-600"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-red-200 dark:border-red-800 p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <p className="text-sm text-neutral-600 mb-4">
          These actions are irreversible. Please proceed with caution.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete Organization
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-600 font-medium">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={deleteOrganization}
                disabled={deleting}
                className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-600"
=======
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Organization Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium mb-4">Organization Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <div className="text-gray-900 dark:text-gray-100">{organization?.name}</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Created</label>
            <div className="text-gray-900 dark:text-gray-100">
              {organization && new Date(organization.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium mb-4">Organization Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{members.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Members</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Building2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.bills}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Bills</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Building2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.vendors}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Vendors</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Building2 className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.projects}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Projects</div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium mb-4">Members ({members.length})</h3>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium">{member.users.email}</div>
                <div className="text-sm text-gray-500">{member.role}</div>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center py-4 text-gray-500">No members found</div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h3>
        <div className="mb-4">
          <p className="text-red-700 dark:text-red-300 mb-2">
            Delete this organization permanently. This action cannot be undone.
          </p>
          {!canDelete && (
            <p className="text-sm text-red-600 dark:text-red-400">
              This organization cannot be deleted because it has {stats.bills} bills, {stats.vendors} vendors, and {stats.projects} projects. 
              Please remove all data first.
            </p>
          )}
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={!canDelete || deleting}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Delete Organization
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium">Confirm Deletion</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{organization?.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteOrganization}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
>>>>>>> origin/beta
              >
                Cancel
              </button>
            </div>
          </div>
<<<<<<< HEAD
        )}
      </div>
    </div>
  );
}
=======
        </div>
      )}
    </div>
  );
}
>>>>>>> origin/beta
