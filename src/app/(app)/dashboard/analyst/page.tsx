'use client';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

type AnalyticsStats = {
  totalSpendThisMonth: number;
  totalSpendLastMonth: number;
  averageMonthlySpend: number;
  mostExpensiveVendor: string;
  mostExpensiveVendorAmount: number;
  totalProjects: number;
  avgBillsPerMonth: number;
};

type ChartPoint = { m: string; v: number };

type VendorSpending = {
  vendor_name: string;
  total_amount: number;
  bill_count: number;
  avg_amount: number;
};

type ProjectSpending = {
  project_name: string;
  total_amount: number;
  bill_count: number;
  percentage: number;
};

export default function AnalystDashboard() {
  const { t } = useLocale();
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<AnalyticsStats>({
    totalSpendThisMonth: 0,
    totalSpendLastMonth: 0,
    averageMonthlySpend: 0,
    mostExpensiveVendor: '',
    mostExpensiveVendorAmount: 0,
    totalProjects: 0,
    avgBillsPerMonth: 0,
  });

  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [vendorSpending, setVendorSpending] = useState<VendorSpending[]>([]);
  const [projectSpending, setProjectSpending] = useState<ProjectSpending[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<number>(0);

  useEffect(() => {
    loadAnalystDashboard();
  }, [supabase]);

  async function loadAnalystDashboard() {
    setLoading(true);
    setError(null);

    try {
      const id = await getDefaultOrgId(supabase);
      if (!id) {
        setError('No organization found');
        setLoading(false);
        return;
      }

      await Promise.all([
        loadAnalyticsStats(id),
        loadChartData(id),
        loadVendorAnalytics(id),
        loadProjectAnalytics(id),
      ]);
    } catch (e: any) {
      setError(e.message || 'Failed to load analyst dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalyticsStats(id: string) {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const [
      { data: thisMonthBills },
      { data: lastMonthBills },
      { data: historicalBills },
      { data: vendorTotals },
      { count: totalProjects },
    ] = await Promise.all([
      supabase
        .from('bill_occurrences')
        .select('amount_due')
        .eq('org_id', id)
        .gte('due_date', thisMonthStart.toISOString().slice(0, 10)),
      supabase
        .from('bill_occurrences')
        .select('amount_due')
        .eq('org_id', id)
        .gte('due_date', lastMonthStart.toISOString().slice(0, 10))
        .lte('due_date', lastMonthEnd.toISOString().slice(0, 10)),
      supabase
        .from('bill_occurrences')
        .select('amount_due, due_date')
        .eq('org_id', id)
        .gte('due_date', sixMonthsAgo.toISOString().slice(0, 10))
        .lt('due_date', thisMonthStart.toISOString().slice(0, 10)),
      supabase
        .from('bill_occurrences')
        .select(
          `
          amount_due,
          bills!inner(vendor_name)
        `
        )
        .eq('org_id', id)
        .gte('due_date', sixMonthsAgo.toISOString().slice(0, 10)),
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', id),
    ]);

    const totalSpendThisMonth = sumAmounts(thisMonthBills);
    const totalSpendLastMonth = sumAmounts(lastMonthBills);
    const historicalTotal = sumAmounts(historicalBills);
    const averageMonthlySpend = historicalTotal / 6;

    // Calculate monthly trend
    const trend =
      lastMonthBills && totalSpendLastMonth > 0
        ? ((totalSpendThisMonth - totalSpendLastMonth) / totalSpendLastMonth) *
          100
        : 0;
    setMonthlyTrend(trend);

    // Calculate average bills per month
    const totalBillCount =
      (historicalBills?.length || 0) + (thisMonthBills?.length || 0);
    const avgBillsPerMonth = totalBillCount / 7; // 6 historical + 1 current month

    // Find most expensive vendor
    const vendorMap = new Map<string, number>();
    (vendorTotals || []).forEach((bill: any) => {
      const vendor = bill.bills?.vendor_name || 'Unknown';
      const amount = Number(bill.amount_due || 0);
      vendorMap.set(vendor, (vendorMap.get(vendor) || 0) + amount);
    });

    let mostExpensiveVendor = '';
    let mostExpensiveVendorAmount = 0;
    vendorMap.forEach((amount, vendor) => {
      if (amount > mostExpensiveVendorAmount) {
        mostExpensiveVendor = vendor;
        mostExpensiveVendorAmount = amount;
      }
    });

    setStats({
      totalSpendThisMonth,
      totalSpendLastMonth,
      averageMonthlySpend,
      mostExpensiveVendor,
      mostExpensiveVendorAmount,
      totalProjects: totalProjects || 0,
      avgBillsPerMonth,
    });
  }

  async function loadChartData(id: string) {
    const today = new Date();
    const chartStart = new Date(today.getFullYear(), today.getMonth() - 11, 1);

    const { data: occ } = await supabase
      .from('bill_occurrences')
      .select('amount_due,due_date')
      .eq('org_id', id)
      .gte('due_date', chartStart.toISOString().slice(0, 10));

    const map = new Map<string, number>();
    (occ ?? []).forEach((o: any) => {
      const d = new Date(o.due_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + Number(o.amount_due || 0));
    });

    const pts: ChartPoint[] = [];
    for (let i = -11; i <= 0; i++) {
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
  }

  async function loadVendorAnalytics(id: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: vendorData } = await supabase
      .from('bill_occurrences')
      .select(
        `
        amount_due,
        bills!inner(vendor_name)
      `
      )
      .eq('org_id', id)
      .gte('due_date', sixMonthsAgo.toISOString().slice(0, 10));

    const vendorMap = new Map<string, { total: number; count: number }>();
    (vendorData || []).forEach((bill: any) => {
      const vendor = bill.bills?.vendor_name || 'Unknown';
      const amount = Number(bill.amount_due || 0);
      const current = vendorMap.get(vendor) || { total: 0, count: 0 };
      vendorMap.set(vendor, {
        total: current.total + amount,
        count: current.count + 1,
      });
    });

    const vendors: VendorSpending[] = Array.from(vendorMap.entries())
      .map(([vendor_name, data]) => ({
        vendor_name,
        total_amount: data.total,
        bill_count: data.count,
        avg_amount: data.total / data.count,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 10);

    setVendorSpending(vendors);
  }

  async function loadProjectAnalytics(id: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: projectData } = await supabase
      .from('bill_occurrences')
      .select(
        `
        amount_due,
        bills!inner(project_name)
      `
      )
      .eq('org_id', id)
      .gte('due_date', sixMonthsAgo.toISOString().slice(0, 10));

    const projectMap = new Map<string, { total: number; count: number }>();
    let grandTotal = 0;

    (projectData || []).forEach((bill: any) => {
      const project = bill.bills?.project_name || 'No Project';
      const amount = Number(bill.amount_due || 0);
      grandTotal += amount;
      const current = projectMap.get(project) || { total: 0, count: 0 };
      projectMap.set(project, {
        total: current.total + amount,
        count: current.count + 1,
      });
    });

    const projects: ProjectSpending[] = Array.from(projectMap.entries())
      .map(([project_name, data]) => ({
        project_name,
        total_amount: data.total,
        bill_count: data.count,
        percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 8);

    setProjectSpending(projects);
  }

  function sumAmounts(rows?: any[] | null) {
    if (!rows) return 0;
    return rows.reduce((acc, r) => acc + Number(r.amount_due || 0), 0);
  }

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
          onClick={loadAnalystDashboard}
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
            {t('dashboard.title')} - Analyst
          </h1>
          <p className="text-sm text-neutral-500">
            Financial analytics and reporting insights
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/reports/today"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
          >
            <BarChart3 className="h-4 w-4" />
            View Reports
          </Link>
        </div>
      </div>

      {/* Top Vendor Highlight */}
      {stats.mostExpensiveVendor && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                Top Vendor: {stats.mostExpensiveVendor}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Total spending: ${stats.mostExpensiveVendorAmount.toFixed(2)}{' '}
                (last 6 months)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Spending Trend Chart */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <h2 className="text-lg font-semibold mb-4">12-Month Spending Trend</h2>
        <DashboardCharts chart={chart} rows={[]} loading={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor Spending Analysis */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">Top Vendors by Spending</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Last 6 months
            </p>
          </div>

          <div className="p-4 space-y-3">
            {vendorSpending.length === 0 ? (
              <div className="text-center text-neutral-500 py-4">
                No vendor data available
              </div>
            ) : (
              vendorSpending.map((vendor, index) => (
                <div
                  key={vendor.vendor_name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {vendor.vendor_name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {vendor.bill_count} bills • Avg: $
                        {vendor.avg_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${vendor.total_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Project Spending Analysis */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">
              Project Spending Distribution
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Last 6 months
            </p>
          </div>

          <div className="p-4 space-y-3">
            {projectSpending.length === 0 ? (
              <div className="text-center text-neutral-500 py-4">
                No project data available
              </div>
            ) : (
              projectSpending.map((project) => (
                <div key={project.project_name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {project.project_name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {project.bill_count} bills
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${project.total_amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {project.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(project.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Report Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/reports/today"
          className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium">Daily Report</p>
              <p className="text-sm text-neutral-500">
                Today&apos;s bills and payments
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/reports/week"
          className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium">Weekly Report</p>
              <p className="text-sm text-neutral-500">
                This week&apos;s financial summary
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/reports/two-weeks"
          className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-purple-600" />
            <div>
              <p className="font-medium">Two-Week Forecast</p>
              <p className="text-sm text-neutral-500">Upcoming expenses</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
