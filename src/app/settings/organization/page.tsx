'use client';
import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

type Organization = {
  id: string;
  name: string;
  slug: string | null;
  branding_prefix: string | null;
  logo_url: string | null;
};

type OrgMember = {
  id: string;
  role: string;
  user_id: string;
};

export default function OrganizationSettingsPage() {
  const supabase = getSupabaseClient();
  const { t } = useLocale();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    branding_prefix: '',
    logo_url: '',
  });

  async function loadOrganization() {
    setLoading(true);
    setError(null);
    const orgId = await getDefaultOrgId(supabase);
    if (!orgId) {
      setError('No organization found');
      setLoading(false);
      return;
    }

    // Load organization details
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgError) {
      setError(orgError.message);
      setLoading(false);
      return;
    }

    // Load organization members
    const { data: membersData, error: membersError } = await supabase
      .from('org_members')
      .select('id,role,user_id')
      .eq('org_id', orgId);

    if (membersError) {
      setError(membersError.message);
    } else {
      setMembers(membersData || []);
    }

    setOrg(orgData);
    setFormData({
      name: orgData.name || '',
      slug: orgData.slug || '',
      branding_prefix: orgData.branding_prefix || '',
      logo_url: orgData.logo_url || '',
    });
    setLoading(false);
  }

  async function saveOrganization(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;

    setLoading(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        name: formData.name.trim(),
        slug: formData.slug.trim() || null,
        branding_prefix: formData.branding_prefix.trim() || null,
        logo_url: formData.logo_url.trim() || null,
      })
      .eq('id', org.id);

    if (error) {
      setError(error.message);
    } else {
      setEditMode(false);
      await loadOrganization();
    }
    setLoading(false);
  }

  async function updateMemberRole(memberId: string, newRole: string) {
    setLoading(true);
    const { error } = await supabase
      .from('org_members')
      .update({ role: newRole as any })
      .eq('id', memberId);

    if (error) {
      setError(error.message);
    } else {
      await loadOrganization();
    }
    setLoading(false);
  }

  useEffect(() => {
    loadOrganization();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !org) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Organization Settings</h1>
        <div className="text-sm text-neutral-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Organization Settings</h1>
        <p className="text-sm text-neutral-500">
          Manage your organization details and members
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950">
          {error}
        </div>
      )}

      {/* Organization Details */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Organization Details</h2>
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              Edit
            </button>
          )}
        </div>

        {editMode ? (
          <form onSubmit={saveOrganization} className="space-y-4">
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
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Slug (optional)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
                placeholder="my-organization"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Branding Prefix (optional)
              </label>
              <input
                type="text"
                value={formData.branding_prefix}
                onChange={(e) =>
                  setFormData({ ...formData, branding_prefix: e.target.value })
                }
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
                placeholder="ABC-"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Logo URL (optional)
              </label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) =>
                  setFormData({ ...formData, logo_url: e.target.value })
                }
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setFormData({
                    name: org?.name || '',
                    slug: org?.slug || '',
                    branding_prefix: org?.branding_prefix || '',
                    logo_url: org?.logo_url || '',
                  });
                }}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Name:</span>{' '}
              {org?.name || 'Not set'}
            </div>
            <div>
              <span className="font-medium">Slug:</span>{' '}
              {org?.slug || 'Not set'}
            </div>
            <div>
              <span className="font-medium">Branding Prefix:</span>{' '}
              {org?.branding_prefix || 'Not set'}
            </div>
            <div>
              <span className="font-medium">Logo URL:</span>{' '}
              {org?.logo_url || 'Not set'}
            </div>
          </div>
        )}
      </div>

      {/* Organization Members */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-lg font-semibold mb-4">Organization Members</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left py-2">User ID</th>
                <th className="text-left py-2">Role</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-neutral-100 dark:border-neutral-800"
                >
                  <td className="py-3">{member.user_id}</td>
                  <td className="py-3">
                    <select
                      value={member.role}
                      onChange={(e) =>
                        updateMemberRole(member.id, e.target.value)
                      }
                      className="rounded border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-800"
                      disabled={loading}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="data_entry">Data Entry</option>
                      <option value="analyst">Analyst</option>
                      <option value="accountant">Accountant</option>
                      <option value="approver">Approver</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-neutral-500">
                      Role management
                    </span>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-neutral-500 text-center">
                    No members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
