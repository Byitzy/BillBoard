"use client";
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { Mail, UserMinus, Users, Plus, Shield } from 'lucide-react';
import SharedSelect from '@/components/ui/SharedSelect';

type Member = {
  id: string;
  email: string | null;
  role: string;
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

const ROLE_LABELS = {
  admin: 'Administrator',
  approver: 'Approver',
  accountant: 'Accountant',
  data_entry: 'Data Entry',
  analyst: 'Analyst',
  viewer: 'Viewer'
};

export default function OrganizationSettingsPage() {
  const supabase = getSupabaseClient();
  const { t } = useLocale();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        fetch(`/api/orgs/${id}/invites`)
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

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !inviteEmail.trim()) return;

    setInviteLoading(true);
    try {
      const response = await fetch(`/api/orgs/${orgId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole
        })
      });

      if (response.ok) {
        setInviteEmail('');
        setInviteRole('viewer');
        await loadData(); // Refresh data
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send invite');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    if (!orgId) return;

    try {
      const response = await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        await loadData(); // Refresh data
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update role');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!orgId || !confirm('Remove this member from the organization?')) return;

    try {
      const response = await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadData(); // Refresh data
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove member');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!orgId || !confirm('Revoke this invitation?')) return;

    try {
      const response = await fetch(`/api/orgs/${orgId}/invites/${inviteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadData(); // Refresh data
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to revoke invite');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to revoke invite');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Organization Settings</h1>
        <div className="text-sm text-neutral-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Organization Settings</h1>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
          {error}
        </div>
      )}

      {/* Invite New Member */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 dark:bg-neutral-900 dark:border-neutral-800">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5" />
          <h2 className="font-medium">Invite New Member</h2>
        </div>
        
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1 dark:text-neutral-300">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
                placeholder="colleague@company.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1 dark:text-neutral-300">
                Role
              </label>
              <SharedSelect
                simple
                simpleValue={inviteRole}
                onSimpleChange={setInviteRole}
                simpleOptions={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={inviteLoading || !inviteEmail.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {inviteLoading ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
      </div>

      {/* Pending Invitations */}
      {invites.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 dark:bg-neutral-900 dark:border-neutral-800">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5" />
            <h2 className="font-medium">Pending Invitations</h2>
          </div>
          
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-xl dark:bg-yellow-900/20 dark:border-yellow-800">
                <div className="flex-1">
                  <div className="font-medium">{invite.email}</div>
                  <div className="text-sm text-neutral-500">
                    Invited as {ROLE_LABELS[invite.role as keyof typeof ROLE_LABELS]} • 
                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeInvite(invite.id)}
                  className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Members */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 dark:bg-neutral-900 dark:border-neutral-800">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5" />
          <h2 className="font-medium">Current Members ({members.length})</h2>
        </div>
        
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-xl dark:border-neutral-700">
              <div className="flex-1">
                <div className="font-medium">{member.email || 'Unknown User'}</div>
                <div className="text-sm text-neutral-500">
                  Joined {new Date(member.created_at).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="min-w-[120px]">
                  <SharedSelect
                    simple
                    simpleValue={member.role}
                    onSimpleChange={(newRole) => handleRoleChange(member.id, newRole)}
                    simpleOptions={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
                    className="text-sm"
                  />
                </div>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="rounded-lg border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Descriptions */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 dark:bg-neutral-900 dark:border-neutral-800">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5" />
          <h2 className="font-medium">Role Permissions</h2>
        </div>
        
        <div className="grid gap-3 text-sm">
          <div><strong>Administrator:</strong> Full access to all features and settings</div>
          <div><strong>Approver:</strong> Can approve bill occurrences and view all data</div>
          <div><strong>Accountant:</strong> Can manage payments and bill states</div>
          <div><strong>Data Entry:</strong> Can create and edit bills, vendors, and projects</div>
          <div><strong>Analyst:</strong> Read-only access to all data for reporting</div>
          <div><strong>Viewer:</strong> Basic read-only access</div>
        </div>
      </div>
    </div>
  );
}

