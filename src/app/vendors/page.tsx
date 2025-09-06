"use client";
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';

type Vendor = { id: string; name: string; contact?: string | null; email?: string | null };

export default function VendorsPage() {
  const supabase = getSupabaseClient();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const orgId = await getDefaultOrgId(supabase);
    if (!orgId) {
      window.location.href = '/onboarding';
      return;
    }
    const { data, error } = await supabase
      .from('vendors')
      .select('id,name,contact,email')
      .eq('org_id', orgId)
      .order('name');
    if (error) setError(error.message);
    else setVendors(data ?? []);
    setLoading(false);
  }

  async function createVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const orgId = await getDefaultOrgId(supabase);
    if (!orgId) {
      setError('No organization found.');
      return;
    }
    const { error } = await supabase.from('vendors').insert({ name, org_id: orgId });
    if (error) setError(error.message);
    setName('');
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Vendors</h1>
        <p className="text-sm text-neutral-500">Manage vendor directory</p>
      </div>
      <form onSubmit={createVendor} className="flex gap-2">
        <input
          placeholder="New vendor name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
        />
        <button type="submit" className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Add
        </button>
      </form>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 text-sm shadow-sm dark:border-neutral-800">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              {['Name', 'Contact', 'Email'].map((h) => (
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
            ) : vendors.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={3}>
                  No vendors yet.
                </td>
              </tr>
            ) : (
              vendors.map((v) => (
                <tr key={v.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-3 py-2">{v.name}</td>
                  <td className="px-3 py-2">{v.contact ?? '—'}</td>
                  <td className="px-3 py-2">{v.email ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
