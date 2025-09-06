"use client";
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import KPI from '@/components/kpi/KPI';
import RentLine from '@/components/charts/RentLine';

type ChartPoint = { m: string; v: number };
type Row = { id: string; vendor?: string | null; project?: string | null; due_date: string; amount_due: number; state: string };

export default function DashboardClient() {
  const supabase = getSupabaseClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vendorsCount, setVendorsCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const id = await getDefaultOrgId(supabase);
      if (!id) {
        setError('No organization found');
        setLoading(false);
        return;
      }
      setOrgId(id);
      try {
        // Counts
        const [{ count: vCount }, { count: pCount }] = await Promise.all([
          supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('org_id', id),
          supabase.from('projects').select('*', { count: 'exact', head: true }).eq('org_id', id)
        ]);
        setVendorsCount(vCount ?? 0);
        setProjectsCount(pCount ?? 0);

        // Pending approvals count
        const { count: pend } = await supabase
          .from('bill_occurrences')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', id)
          .eq('state', 'pending_approval');
        setPendingCount(pend ?? 0);

        // Upcoming 7 days scheduled
        const today = new Date();
        const in7 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
        const tISO = today.toISOString().slice(0, 10);
        const nISO = in7.toISOString().slice(0, 10);
        const { count: upc } = await supabase
          .from('bill_occurrences')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', id)
          .eq('state', 'scheduled')
          .gte('due_date', tISO)
          .lte('due_date', nISO);
        setUpcomingCount(upc ?? 0);

        // Chart: last 6 months totals
        const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        const startISO = start.toISOString().slice(0, 10);
        const { data: occ } = await supabase
          .from('bill_occurrences')
          .select('amount_due,due_date')
          .eq('org_id', id)
          .gte('due_date', startISO)
          .lte('due_date', nISO);
        const map = new Map<string, number>();
        (occ ?? []).forEach((o: any) => {
          const d = new Date(o.due_date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          map.set(key, (map.get(key) ?? 0) + Number(o.amount_due || 0));
        });
        const pts: ChartPoint[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          pts.push({ m: d.toLocaleString(undefined, { month: 'short' }), v: Math.round((map.get(key) ?? 0) * 100) / 100 });
        }
        setChart(pts);

        // Recent items (next 10 occurrences by due date)
        const { data: recent } = await supabase
          .from('bill_occurrences')
          .select('id,due_date,amount_due,state')
          .eq('org_id', id)
          .order('due_date', { ascending: true })
          .limit(10);
        setRows(
          (recent ?? []).map((r: any) => ({ id: r.id, due_date: r.due_date, amount_due: Number(r.amount_due), state: r.state }))
        );
      } catch (e: any) {
        setError(e.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  const kpis = useMemo(
    () => [
      { label: 'Upcoming (7d)', value: upcomingCount },
      { label: 'Pending', value: pendingCount },
      { label: 'Vendors', value: vendorsCount },
      { label: 'Projects', value: projectsCount }
    ],
    [upcomingCount, pendingCount, vendorsCount, projectsCount]
  );

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <KPI key={k.label} label={k.label} value={k.value} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Upcoming Occurrences</h2>
              <p className="text-xs text-neutral-500">Next 10 upcoming</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="text-left" role="row">
                  {['Due', 'Amount', 'State'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 text-neutral-500" role="columnheader">
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
                      Nothing coming up.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} role="row" className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="px-3 py-2">{r.due_date}</td>
                      <td className="px-3 py-2">${r.amount_due.toFixed(2)}</td>
                      <td className="px-3 py-2">{r.state}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800">
          <div>
            <h2 className="text-base font-semibold">Monthly Totals</h2>
            <p className="text-xs text-neutral-500">Last 6 months</p>
          </div>
          <RentLine data={chart} />
        </div>
      </div>
    </div>
  );
}

