"use client";
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';

type Member = { id: string; user_id: string; role: string; email: string | null };

const ROLES = ['admin', 'approver', 'accountant', 'data_entry', 'analyst', 'viewer'] as const;

export default function AdminUsersPage() {
  const supabase = getSupabaseClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<typeof ROLES[number]>('viewer');

  async function load() {
    setLoading(true);
    setError(null);
    const id = await getDefaultOrgId(supabase);
    if (!id) {
      window.location.href = '/onboarding';
      return;
    }
    setOrgId(id);
    try {
      const res = await fetch(`/api/orgs/${id}/members`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load members');
      setMembers(data.members as Member[]);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Invite failed');
      setEmail('');
      setRole('viewer');
      await load();
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => members, [members]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin · Users</h1>
      </div>

      <form onSubmit={invite} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-56">
          <label className="block text-xs text-neutral-500 mb-1">Email</label>
          <input
            type="email"
            required
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof ROLES[number])}
            className="rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          Invite
        </button>
      </form>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 text-sm shadow-sm dark:border-neutral-800">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              {['Email', 'User ID', 'Role'].map((h) => (
                <th key={h} className="px-3 py-2 text-neutral-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-2" colSpan={3}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={3}>
                  No members yet.
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-3 py-2">{m.email ?? '-'}</td>
                  <td className="px-3 py-2">{m.user_id}</td>
                  <td className="px-3 py-2">{m.role}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

