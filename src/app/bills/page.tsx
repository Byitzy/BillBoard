"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';

type BillRow = {
  id: string;
  title: string;
  amount_total: number;
  due_date: string | null;
};

export default function BillsPage() {
  const supabase = getSupabaseClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    const id = await getDefaultOrgId(supabase);
    setOrgId(id);
    if (!id) {
      // Redirect to onboarding if no org
      window.location.href = '/onboarding';
      return;
    }
    const { data, error } = await supabase
      .from('bills')
      .select('id,title,amount_total,due_date')
      .eq('org_id', id)
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setBills((data ?? []) as BillRow[]);
    setLoading(false);
  }

  async function createBill(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    const amt = parseFloat(amount);
    if (!title.trim() || Number.isNaN(amt)) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from('bills').insert({
      org_id: orgId,
      title: title.trim(),
      amount_total: amt,
      due_date: due ? due : null
    });
    if (error) setError(error.message);
    setTitle('');
    setAmount('');
    setDue('');
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bills</h1>
      </div>

      <form onSubmit={createBill} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
        />
        <input
          placeholder="Amount (CAD)"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
        />
        <input
          type="date"
          placeholder="Due date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
        />
        <div>
          <button type="submit" className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Create Bill
          </button>
        </div>
      </form>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 text-sm shadow-sm dark:border-neutral-800">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              {['Title', 'Amount', 'Due', ''].map((h) => (
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
                  Loading...
                </td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={4}>
                  No bills yet.
                </td>
              </tr>
            ) : (
              bills.map((b) => (
                <tr key={b.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-3 py-2">{b.title}</td>
                  <td className="px-3 py-2">${b.amount_total.toFixed(2)}</td>
                  <td className="px-3 py-2">{b.due_date ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/bills/${b.id}`} className="rounded-lg border px-2 py-1 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
                      View
                    </Link>
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
