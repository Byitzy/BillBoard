'use client';
import {
  Users,
  Building2,
  FileText,
  CheckSquare,
  TrendingUp,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import DashboardMetrics from '@/components/dashboard/DashboardMetrics';
import { useLocale } from '@/components/i18n/LocaleProvider';
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

type AdminStats = {
  totalMembers: number;
  totalBills: number;
  pendingApprovals: number;
  totalVendors: number;
  totalProjects: number;
};

export default function AdminDashboard() {
  const { t } = useLocale();
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingBills, setProcessingBills] = useState(false);

  // Original dashboard metrics
  const [todayTotal, setTodayTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [twoWeeksTotal, setTwoWeeksTotal] = useState(0);
  const [onHoldCount, setOnHoldCount] = useState(0);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [todayProjects, setTodayProjects] = useState<ProjectTotal[]>([]);
  const [weekProjects, setWeekProjects] = useState<ProjectTotal[]>([]);
  const [twoWeeksProjects, setTwoWeeksProjects] = useState<ProjectTotal[]>([]);

  // Admin-specific stats
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalMembers: 0,
    totalBills: 0,
    pendingApprovals: 0,
    totalVendors: 0,
    totalProjects: 0,
  });

  useEffect(() => {
    loadAdminDashboard();
  }, [supabase]);

  async function loadAdminDashboard() {
    setLoading(true);
    setError(null);

    try {
      const id = await getDefaultOrgId(supabase);
      if (!id) {
        setError('No organization found');
        setLoading(false);
        return;
      }

      // Load original dashboard metrics (financial data)
      await loadFinancialMetrics(id);

      // Load admin-specific stats
      await loadAdminStats(id);
    } catch (e: any) {
      setError(e.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function loadFinancialMetrics(id: string) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
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
    const [todayProjects, weekProjects, twoWeeksProjects] = await Promise.all([
      getTotalsByProject(supabase, id, { start: tISO, end: tISO }),
      getTotalsByProject(supabase, id, { start: wStartISO, end: wEndISO }),
      getTotalsByProject(supabase, id, { start: tISO, end: twEndISO }),
    ]);
    setTodayProjects(todayProjects);
    setWeekProjects(weekProjects);
    setTwoWeeksProjects(twoWeeksProjects);

    // On hold count
    const { count: hold } = await supabase
      .from('bill_occurrences')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', id)
      .eq('state', 'on_hold')
      .gte('due_date', tISO)
      .lte('due_date', twEndISO);
    setOnHoldCount(hold ?? 0);

    // Chart data (same logic as original)
    const chartStart = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const chartEnd = new Date(today.getFullYear(), today.getMonth() + 10, 0);
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

    // Recent items (with proper vendor/project data)
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
  }

  async function loadAdminStats(id: string) {
    const [
      { count: totalMembers },
      { count: totalBills },
      { count: pendingApprovals },
      { count: totalVendors },
      { count: totalProjects },
    ] = await Promise.all([
      supabase
        .from('org_members')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', id)
        .eq('status', 'active'),
      supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', id),
      supabase
        .from('bill_occurrences')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', id)
        .eq('state', 'pending_approval'),
      supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', id),
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', id),
    ]);

    setAdminStats({
      totalMembers: totalMembers ?? 0,
      totalBills: totalBills ?? 0,
      pendingApprovals: pendingApprovals ?? 0,
      totalVendors: totalVendors ?? 0,
      totalProjects: totalProjects ?? 0,
    });
  }

  function sumAmounts(rows?: any[] | null) {
    if (!rows) return 0;
    return rows.reduce((acc, r) => acc + Number(r.amount_due || 0), 0);
  }

  const processPendingBills = async () => {
    setProcessingBills(true);
    try {
      const response = await fetch('/api/admin/process-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process bills');
      }

      // Reload the dashboard to show updated counts
      await loadAdminDashboard();
    } catch (error: any) {
      setError(error.message || 'Failed to process bills');
    } finally {
      setProcessingBills(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadAdminDashboard}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {t('dashboard.title')} - Admin
          </h1>
          <p className="text-sm text-neutral-500">
            Complete organization overview and management
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={processPendingBills}
            disabled={processingBills}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50"
          >
            <Clock className="h-4 w-4" />
            {processingBills ? 'Processing...' : 'Process Pending Bills'}
          </button>
          <Link
            href="/settings/organization"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
          >
            <Users className="h-4 w-4" />
            Manage Organization
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/bills"
          className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium">Manage Bills</p>
              <p className="text-sm text-neutral-500">Create and edit bills</p>
            </div>
          </div>
        </Link>

        <Link
          href="/approvals"
          className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <CheckSquare className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium">Review Approvals</p>
              <p className="text-sm text-neutral-500">
                {adminStats.pendingApprovals} pending
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/vendors"
          className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-purple-600" />
            <div>
              <p className="font-medium">Manage Vendors</p>
              <p className="text-sm text-neutral-500">
                {adminStats.totalVendors} vendors
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/organization"
          className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-indigo-600" />
            <div>
              <p className="font-medium">Organization</p>
              <p className="text-sm text-neutral-500">
                {adminStats.totalMembers} members
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Financial Metrics */}
      <DashboardMetrics
        todayTotal={todayTotal}
        weekTotal={weekTotal}
        twoWeeksTotal={twoWeeksTotal}
        onHoldCount={onHoldCount}
        todayProjects={todayProjects}
        weekProjects={weekProjects}
        twoWeeksProjects={twoWeeksProjects}
      />

      {/* Charts */}
      <DashboardCharts chart={chart} rows={rows} loading={false} />
    </div>
  );
}
