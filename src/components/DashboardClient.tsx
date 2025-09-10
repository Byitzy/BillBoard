'use client';
import { useEffect, useState } from 'react';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import DashboardMetrics from '@/components/dashboard/DashboardMetrics';
import { getTotalsByProject, type ProjectTotal } from '@/lib/metrics';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

type ChartPoint = { m: string; v: number };
type Row = {
  id: string;
  bill_id?: string;
  vendor?: string | null;
  project?: string | null;
  due_date: string;
  amount_due: number;
  state: string;
};

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
  const [todayProjects, setTodayProjects] = useState<ProjectTotal[]>([]);
  const [weekProjects, setWeekProjects] = useState<ProjectTotal[]>([]);
  const [twoWeeksProjects, setTwoWeeksProjects] = useState<ProjectTotal[]>([]);

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

        const [{ data: tRows }, { data: wRows }, { data: twRows }] =
          await Promise.all([
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
              .lte('due_date', twEndISO),
          ]);
        setTodayTotal(sumAmounts(tRows));
        setWeekTotal(sumAmounts(wRows));
        setTwoWeeksTotal(sumAmounts(twRows));

        // Project breakdowns
        const [todayProjects, weekProjects, twoWeeksProjects] =
          await Promise.all([
            getTotalsByProject(supabase, id, { start: tISO, end: tISO }),
            getTotalsByProject(supabase, id, {
              start: wStartISO,
              end: wEndISO,
            }),
            getTotalsByProject(supabase, id, { start: tISO, end: twEndISO }),
          ]);
        setTodayProjects(todayProjects);
        setWeekProjects(weekProjects);
        setTwoWeeksProjects(twoWeeksProjects);

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
        const chartStart = new Date(
          today.getFullYear(),
          today.getMonth() - 3,
          1
        );
        const chartEnd = new Date(
          today.getFullYear(),
          today.getMonth() + 10,
          0
        ); // end of +9 month
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
          const label = d.toLocaleString(undefined, {
            month: 'short',
            year: '2-digit',
          });
          pts.push({
            m: label,
            v: Math.round((map.get(key) ?? 0) * 100) / 100,
          });
        }
        setChart(pts);

        // Recent items (next 10 occurrences by due date)
        const { data: recent } = await supabase
          .from('bill_occurrences')
          .select(
            `
            id,
            bill_id,
            due_date,
            amount_due,
            state,
            bills(
              id,
              vendors(name),
              projects(name)
            )
          `
          )
          .eq('org_id', id)
          .order('due_date', { ascending: true })
          .limit(10);
        setRows(
          (recent ?? []).map((r: any) => ({
            id: r.id,
            bill_id: r.bill_id,
            vendor: r.bills?.vendors?.name || null,
            project: r.bills?.projects?.name || null,
            due_date: r.due_date,
            amount_due: Number(r.amount_due),
            state: r.state,
          }))
        );
      } catch (e: any) {
        setError(e.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-red-600">{error}</div>}

      <DashboardMetrics
        todayTotal={todayTotal}
        weekTotal={weekTotal}
        twoWeeksTotal={twoWeeksTotal}
        onHoldCount={onHoldCount}
        todayProjects={todayProjects}
        weekProjects={weekProjects}
        twoWeeksProjects={twoWeeksProjects}
      />

      <DashboardCharts chart={chart} rows={rows} loading={loading} />
    </div>
  );
}

function sumAmounts(rows?: any[] | null) {
  if (!rows) return 0;
  return rows.reduce((acc, r) => acc + Number(r.amount_due || 0), 0);
}
