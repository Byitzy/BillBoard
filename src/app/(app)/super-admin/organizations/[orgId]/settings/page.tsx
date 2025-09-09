'use client';
import { ArrowLeft, Building2, Save, Trash2, Settings } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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

export default function SuperAdminOrgSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    branding_prefix: '',
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
          router.replace('/login');
          return;
        }

        const userIsSuperAdmin =
          session.user.user_metadata?.is_super_admin === 'true' ||
          session.user.user_metadata?.is_super_admin === true;

        setIsSuperAdmin(userIsSuperAdmin);

        if (!userIsSuperAdmin) {
          router.replace('/dashboard');
          return;
        }

        await loadOrganization();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    if (orgId) {
      checkAuthAndLoadData();
    }
  }, [orgId, router, supabase]);

  async function loadOrganization() {
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgError) {
        throw orgError;
      }

      setOrganization(orgData);
      setFormData({
        name: orgData.name || '',
        slug: orgData.slug || '',
        branding_prefix: orgData.branding_prefix || '',
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load organization'
      );
    }
  }

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

      if (updateError) {
        throw updateError;
      }

      setSuccess('Settings saved successfully');
      await loadOrganization();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrganization() {
    if (!organization) return;
    
    setDeleting(true);
    setError(null);

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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete organization');
      }

      const { message } = await response.json();

      // Redirect to super admin dashboard after successful deletion
      router.push('/super-admin' as any);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete organization'
      );
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-neutral-600 dark:text-neutral-400">{error}</p>
          <Link
            href="/super-admin"
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
          >
            Back to Super Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
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
            Configure settings for {organization?.name}
          </p>
        </div>
      </div>

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
      {organization && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold mb-4">General Settings</h2>
          <form onSubmit={saveSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-900"
                placeholder="organization-slug"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Used for organization URLs and identification
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Branding Prefix
              </label>
              <input
                type="text"
                value={formData.branding_prefix}
                onChange={(e) => setFormData({ ...formData, branding_prefix: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-900"
                placeholder="ORG"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Short prefix for bill numbers and documentation
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-4">
          Danger Zone
        </h2>
        <p className="text-red-600 dark:text-red-400 mb-4">
          Permanently delete this organization and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700"
        >
          <Trash2 className="h-4 w-4" />
          Delete Organization
        </button>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Are you sure you want to delete "{organization?.name}"? This action cannot be undone and will permanently remove all associated data.
              </p>
              <div className="flex gap-3">
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
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}