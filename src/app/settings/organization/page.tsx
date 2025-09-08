'use client';
import { useEffect, useState, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { Mail, Users, Plus } from 'lucide-react';
import MemberFilters from '@/components/organization/MemberFilters';
import InviteForm from '@/components/organization/InviteForm';
import MemberList from '@/components/organization/MemberList';

type Member = {
  id: string;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
  user_id: string;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
};

export default function OrganizationSettingsPage() {
  const supabase = getSupabaseClient();
  const { t } = useLocale();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadData();
    getCurrentUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered members based on search and filter criteria
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Search filter (email/name)
      const matchesSearch =
        !searchTerm ||
        (member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ??
          false);

      // Role filter
      const matchesRole = !roleFilter || member.role === roleFilter;

      // Status filter
      const matchesStatus = !statusFilter || member.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [members, searchTerm, roleFilter, statusFilter]);

  async function getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  }

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const id = await getDefaultOrgId(supabase);
      setOrgId(id);
      if (!id) return;

      // Load members and invites in parallel
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/orgs/${id}/members`),
        fetch(`/api/orgs/${id}/invites`),
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvites(invitesData.invites || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(memberId: string, newStatus: string) {
    if (!orgId) return;

    try {
      const response = await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, status: newStatus } : m))
        );
      } else {
        const error = await response.json();
        alert(`Failed to update status: ${error.error}`);
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    if (!orgId) return;

    try {
      const response = await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
      } else {
        const error = await response.json();
        alert(`Failed to update role: ${error.error}`);
      }
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!orgId || !confirm('Are you sure you want to remove this member?'))
      return;

    try {
      const response = await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        const error = await response.json();
        alert(`Failed to remove member: ${error.error}`);
      }
    } catch (err: any) {
      alert(`Failed to remove member: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 text-red-700 hover:text-red-900 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-yellow-700">
          No organization found. Please create or join an organization first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('settings.organization.title', 'Organization Settings')}
          </h1>
          <p className="text-gray-600">
            {t(
              'settings.organization.description',
              'Manage your organization members and invitations'
            )}
          </p>
        </div>
      </div>

      {/* Invite Form */}
      <InviteForm orgId={orgId} onInviteSent={loadData} />

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">
              Pending Invites ({invites.length})
            </h3>
          </div>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between py-2 px-3 bg-white rounded border"
              >
                <div>
                  <span className="font-medium">{invite.email}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    as {invite.role}
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  Expires {new Date(invite.expires_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-medium">
                Members ({members.length})
              </h2>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4">
            <MemberFilters
              roleFilter={roleFilter}
              statusFilter={statusFilter}
              searchTerm={searchTerm}
              onRoleFilterChange={setRoleFilter}
              onStatusFilterChange={setStatusFilter}
              onSearchTermChange={setSearchTerm}
            />
          </div>
        </div>

        {/* Member List */}
        <div className="p-6">
          <MemberList
            members={filteredMembers}
            currentUserId={currentUserId || ''}
            onStatusChange={handleStatusChange}
            onRoleChange={handleRoleChange}
            onRemoveMember={handleRemoveMember}
          />
        </div>
      </div>
    </div>
  );
}
