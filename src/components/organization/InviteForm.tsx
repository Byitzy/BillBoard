'use client';

import { useState } from 'react';
import SharedSelect from '@/components/ui/SharedSelect';
import { getSupabaseClient } from '@/lib/supabase/client';

interface InviteFormProps {
  orgId: string;
  onInviteSent: () => void;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'approver', label: 'Approver' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'data_entry', label: 'Data Entry' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'viewer', label: 'Viewer' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export default function InviteForm({ orgId, onInviteSent }: InviteFormProps) {
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'viewer' as const,
    status: 'active' as const,
  });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError('');

    try {
      // Get the current session token to include in API request
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('You must be logged in to send invites');
      }

      const response = await fetch(`/api/orgs/${orgId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(inviteForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invite');
      }

      setInviteForm({ email: '', role: 'viewer', status: 'active' });
      onInviteSent();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <h3 className="mb-4 text-lg font-medium">Invite New Member</h3>
      <form onSubmit={handleSendInvite} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            value={inviteForm.email}
            onChange={(e) =>
              setInviteForm((prev) => ({ ...prev, email: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <SharedSelect
              simple
              simpleValue={inviteForm.role}
              onSimpleChange={(value: string) =>
                setInviteForm((prev) => ({ ...prev, role: value as any }))
              }
              simpleOptions={ROLE_OPTIONS}
              className="mt-1 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <SharedSelect
              simple
              simpleValue={inviteForm.status}
              onSimpleChange={(value: string) =>
                setInviteForm((prev) => ({ ...prev, status: value as any }))
              }
              simpleOptions={STATUS_OPTIONS}
              className="mt-1 w-full"
            />
          </div>
        </div>
        {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
        <button
          type="submit"
          disabled={isInviting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 sm:w-auto"
        >
          {isInviting ? 'Sending...' : 'Send Invite'}
        </button>
      </form>
    </div>
  );
}
