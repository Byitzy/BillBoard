'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

type Vendor = {
  id: string;
  name: string;
  bills?: { count: number }[];
  totalAmount?: number;
};

export default function VendorsPage() {
  const supabase = getSupabaseClient();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || ''
  );

  // Filter vendors based on search query
  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const searchLower = searchQuery.toLowerCase();
    return vendors.filter((vendor) =>
      vendor.name.toLowerCase().includes(searchLower)
    );
  }, [vendors, searchQuery]);

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
      .select('id,name,bills(count)')
      .eq('org_id', orgId)
      .order('name');
    if (error) {
      setError(error.message);
    } else {
      const vendorsData = data ?? [];

      // Get total amounts for each vendor
      const vendorsWithTotals = await Promise.all(
        vendorsData.map(async (vendor: any) => {
          const { data: billsData } = await supabase
            .from('bills')
            .select('amount_total')
            .eq('vendor_id', vendor.id)
            .eq('org_id', orgId);

          const totalAmount = (billsData ?? []).reduce(
            (sum: number, bill: any) => sum + (Number(bill.amount_total) || 0),
            0
          );

          return {
            ...vendor,
            totalAmount,
          };
        })
      );

      setVendors(vendorsWithTotals);
    }
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
    // Check existing by case-insensitive match
    const { data: existing } = await supabase
      .from('vendors')
      .select('id')
      .eq('org_id', orgId)
      .ilike('name', name.trim());
    if (existing && existing.length > 0) {
      setError(t('vendors.vendorExists'));
      setLoading(false);
      return;
    }
    const { error } = await supabase
      .from('vendors')
      .insert({ name: name.trim(), org_id: orgId });
    if (error) setError(error.message);
    setName('');
    await load();
  }

  async function startEdit(v: Vendor) {
    setEditing(v.id);
    setEditName(v.name);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from('vendors')
      .update({ name: editName.trim() })
      .eq('id', id);
    if (error) setError(error.message);
    setEditing(null);
    setEditName('');
    await load();
  }

  async function removeVendor(id: string) {
    if (!confirm(t('vendors.deleteVendor'))) return;
    setLoading(true);
    const { error } = await supabase.from('vendors').delete().eq('id', id);
    if (error) setError(error.message);
    await load();
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t('vendors.title')}</h1>
        <p className="text-sm text-neutral-500">
          {t('vendors.manageDirectory')}
        </p>
      </div>
      <div className="space-y-3">
        <form onSubmit={createVendor} className="flex gap-2">
          <input
            placeholder={t('vendors.newVendorName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('bills.add')}
          </button>
        </form>

        {/* Search input */}
        <div className="max-w-sm">
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
          />
        </div>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 text-sm shadow-sm dark:border-neutral-800">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              {[
                t('common.name'),
                t('common.bills'),
                t('common.totalDollar'),
                t('common.actions'),
              ].map((h) => (
                <th key={h} className="px-3 py-2 text-neutral-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-2" colSpan={4}>
                  {t('common.loading')}
                </td>
              </tr>
            ) : filteredVendors.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={4}>
                  {vendors.length === 0
                    ? 'No vendors yet.'
                    : 'No vendors match your search.'}
                </td>
              </tr>
            ) : (
              filteredVendors.map((v) => (
                <tr
                  key={v.id}
                  className="border-t border-neutral-100 dark:border-neutral-800"
                >
                  <td className="px-3 py-2">
                    {editing === v.id ? (
                      <input
                        className="w-full rounded-xl border border-neutral-200  px-2 py-1 text-sm dark:border-neutral-800"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      v.name
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/bills?vendorId=${v.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {v.bills?.[0]?.count ?? 0}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/bills?vendorId=${v.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                    >
                      ${(v.totalAmount ?? 0).toFixed(2)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      {editing === v.id ? (
                        <>
                          <button
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
                            onClick={() => saveEdit(v.id)}
                          >
                            {t('common.save')}
                          </button>
                          <button
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
                            onClick={() => {
                              setEditing(null);
                              setEditName('');
                            }}
                          >
                            {t('common.cancel')}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
                            onClick={() => startEdit(v)}
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            className="rounded-lg border px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                            onClick={() => removeVendor(v.id)}
                          >
                            {t('common.delete')}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
