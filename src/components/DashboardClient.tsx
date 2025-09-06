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

  const [todayTotal, setTodayTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [twoWeeksTotal, setTwoWeeksTotal] = useState(0);
  const [onHoldCount, setOnHoldCount] = useState(0);
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
        // Totals
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday start
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const endTwoWeeks = new Date(today);
        endTwoWeeks.setDate(today.getDate() + 14);

        const tISO = today.toISOString().slice(0, 10);
        const wStartISO = startOfWeek.toISOString().slice(0, 10);
        const wEndISO = endOfWeek.toISOString().slice(0, 10);
        const twEndISO = endTwoWeeks.toISOString().slice(0, 10);

        const states = ['scheduled', 'approved'];

        const [{ data: tRows }, { data: wRows }, { data: twRows }] = await Promise.all([
          supabase
            .from('bill_occurrences')
            .select('amount_due')
            .eq('org_id', id)
            .in('state', states)
            .eq('due_date', tISO),
          supabase
            .from('bill_occurrences')
            .select('amount_due')
            .eq('org_id', id)
            .in('state', states)
            .gte('due_date', wStartISO)
            .lte('due_date', wEndISO),
          supabase
            .from('bill_occurrences')
            .select('amount_due')
            .eq('org_id', id)
            .in('state', states)
            .gte('due_date', tISO)
            .lte('due_date', twEndISO)
        ]);
        setTodayTotal(sumAmounts(tRows));
        setWeekTotal(sumAmounts(wRows));
        setTwoWeeksTotal(sumAmounts(twRows));

        // On hold count (upcoming two weeks)
        const { count: hold } = await supabase
          .from('bill_occurrences')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', id)
          .eq('state', 'on_hold')
          .gte('due_date', tISO)
          .lte('due_date', twEndISO);
        setOnHoldCount(hold ?? 0);

        // Chart: 3 months prior and 9 months ahead (total 13 months)
        const chartStart = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        const chartEnd = new Date(today.getFullYear(), today.getMonth() + 10, 0); // end of +9 month
        const chartStartISO = chartStart.toISOString().slice(0, 10);
        const chartEndISO = chartEnd.toISOString().slice(0, 10);
        const { data: occ } = await supabase
          .from('bill_occurrences')
          .select('amount_due,due_date')
          .eq('org_id', id)
          .gte('due_date', chartStartISO)
          .lte('due_date', chartEndISO);
        const map = new Map<string, number>();
        (occ ?? []).forEach((o: any) => {
          const d = new Date(o.due_date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          map.set(key, (map.get(key) ?? 0) + Number(o.amount_due || 0));
        });
        const pts: ChartPoint[] = [];
        for (let i = -3; i <= 9; i++) {
          const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleString(undefined, { month: 'short', year: '2-digit' });
          pts.push({ m: label, v: Math.round((map.get(key) ?? 0) * 100) / 100 });
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
      {
        label: 'Today',
        value: `$${todayTotal.toFixed(2)}`,
        tooltip: 'Total scheduled/approved for today',
        href: '/reports/today'
      },
      {
        label: 'This Week',
        value: `$${weekTotal.toFixed(2)}`,
        tooltip: 'Total scheduled/approved this calendar week',
        href: '/reports/week'
      },
      {
        label: 'Next 2 Weeks',
        value: `$${twoWeeksTotal.toFixed(2)}`,
        tooltip: 'Total scheduled/approved in next 14 days',
        href: '/reports/two-weeks'
      },
      {
        label: 'On Hold',
        value: onHoldCount,
        tooltip: 'Occurrences on hold in next 14 days',
        href: '/reports/on-hold'
      }
    ],
    [todayTotal, weekTotal, twoWeeksTotal, onHoldCount]
  );

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <KPI key={k.label} label={k.label} value={k.value} index={i} tooltip={k.tooltip as any} href={k.href as any} />
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

function sumAmounts(rows?: any[] | null) {
  if (!rows) return 0;
  return rows.reduce((acc, r) => acc + Number(r.amount_due || 0), 0);
}
