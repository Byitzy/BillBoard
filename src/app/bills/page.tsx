"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import BillForm from '@/components/BillForm';

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
  const [nextDue, setNextDue] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


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
    else {
      const rows = (data ?? []) as BillRow[];
      setBills(rows);
      // compute next due for recurring bills
      const ids = rows.filter((b) => !b.due_date).map((b) => b.id);
      if (ids.length > 0) {
        const today = new Date();
        const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const { data: occ } = await supabase
          .from('bill_occurrences')
          .select('bill_id,due_date')
          .in('bill_id', ids)
          .gte('due_date', iso)
          .order('due_date', { ascending: true });
        const map: Record<string, string> = {};
        occ?.forEach((o: any) => {
          if (!map[o.bill_id]) map[o.bill_id] = o.due_date;
        });
        setNextDue(map);
      } else {
        setNextDue({});
      }
    }
    setLoading(false);
  }


  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bills</h1>
      </div>

      <BillForm onCreated={load} />

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
                  <td className="px-3 py-2">{b.due_date ?? nextDue[b.id] ?? '-'}</td>
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
