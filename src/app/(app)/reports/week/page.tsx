'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

type Occurrence = {
  id: string;
  due_date: string;
  amount_due: number;
  state: string;
  bills: {
    title: string;
    vendors: { name: string }[];
  }[];
};

export default function WeekReport() {
  const supabase = getSupabaseClient();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWeekReport() {
      try {
        setLoading(true);
        const orgId = await getDefaultOrgId(supabase);
        if (!orgId) {
          setError('No organization found');
          return;
        }

        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday start
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const { data, error } = await supabase
          .from('bill_occurrences')
          .select(
            `
            id,
            due_date,
            amount_due,
            state,
            bills!inner (
              title,
              vendors (name)
            )
          `
          )
          .eq('org_id', orgId)
          .in('state', ['scheduled', 'approved'])
          .gte('due_date', startOfWeek.toISOString().slice(0, 10))
          .lte('due_date', endOfWeek.toISOString().slice(0, 10))
          .order('due_date');

        if (error) throw error;
        setOccurrences(data as Occurrence[]);
      } catch (err: any) {
        setError(err.message || 'Failed to load week report');
      } finally {
        setLoading(false);
      }
    }

    loadWeekReport();
  }, [supabase]);

  const total = occurrences.reduce((sum, o) => sum + o.amount_due, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Report · This Week</h1>
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="rounded-2xl border border-neutral-200 p-4 card-surface dark:border-neutral-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Bills Due This Week</h2>
          <div className="text-2xl font-semibold">${total.toFixed(2)}</div>
        </div>

        {loading ? (
          <div className="text-sm text-neutral-500">Loading...</div>
        ) : occurrences.length === 0 ? (
          <div className="text-sm text-neutral-500">
            No bills due this week.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-neutral-200 dark:border-neutral-700">
                  <th className="pb-2 font-medium text-neutral-500">Bill</th>
                  <th className="pb-2 font-medium text-neutral-500">Vendor</th>
                  <th className="pb-2 font-medium text-neutral-500">
                    Due Date
                  </th>
                  <th className="pb-2 font-medium text-neutral-500">Amount</th>
                  <th className="pb-2 font-medium text-neutral-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {occurrences.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-neutral-100 dark:border-neutral-800"
                  >
                    <td className="py-3">{o.bills[0]?.title || '—'}</td>
                    <td className="py-3 text-neutral-600 dark:text-neutral-300">
                      {o.bills[0]?.vendors[0]?.name || '—'}
                    </td>
                    <td className="py-3">{o.due_date}</td>
                    <td className="py-3 font-medium">
                      ${o.amount_due.toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          o.state === 'approved'
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                      ></span>
                      {o.state}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
