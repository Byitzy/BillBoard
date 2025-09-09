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
    } finally {
      setLoading(false);
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
            Configure settings for {organization.name}
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
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
